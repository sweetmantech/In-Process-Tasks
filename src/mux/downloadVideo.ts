import { logger, retry } from '@trigger.dev/sdk/v3';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Downloads a video file from MUX using the asset's master download URL
 * Optimized for large files (>80MB) with streaming to disk to avoid memory issues
 *
 * @param downloadUrl - The MUX asset's master download URL
 * @returns A File object containing the downloaded video
 * @throws Error if download fails
 */
export const downloadVideo = async (downloadUrl: string): Promise<File> => {
  logger.log('Starting video download from MUX', {
    downloadUrl,
  });

  const startTime = Date.now();
  let tempFilePath: string | null = null;

  try {
    // Use retry.fetch with extended timeout for large files
    // For 80MB+ files, allow up to 10 minutes (600000ms) for download
    // Assuming minimum 1.5MB/s download speed: 80MB / 1.5MB/s ≈ 53 seconds
    // Adding buffer for network variability: 10 minutes should be sufficient
    const response = await retry.fetch(downloadUrl, {
      timeoutInMs: 600_000, // 10 minutes timeout
      retry: {
        timeout: {
          maxAttempts: 3,
          factor: 1.5,
          minTimeoutInMs: 5_000,
          maxTimeoutInMs: 30_000,
          randomize: true,
        },
        byStatus: {
          '500-599': {
            strategy: 'backoff',
            maxAttempts: 3,
            factor: 2,
            minTimeoutInMs: 2_000,
            maxTimeoutInMs: 10_000,
            randomize: false,
          },
        },
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download video from MUX: ${response.statusText} (${response.status})`
      );
    }

    // Get content length for progress tracking
    const contentLength = response.headers.get('content-length');
    const fileSizeMB = contentLength
      ? (parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2)
      : 'unknown';

    logger.log('Download started, streaming to disk', {
      fileSizeMB,
      contentType: response.headers.get('content-type'),
    });

    // Stream the response to a temporary file instead of loading into memory
    // This prevents OOM errors for large videos
    tempFilePath = join(
      tmpdir(),
      `mux-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`
    );

    // Convert ReadableStream to Node.js Readable stream
    // Use type assertion to handle ReadableStream compatibility
    if (!response.body) {
      throw new Error('Response body is null');
    }
    const nodeStream = Readable.fromWeb(response.body as any);
    const writeStream = createWriteStream(tempFilePath);

    // Stream the download to disk
    await pipeline(nodeStream, writeStream);

    const downloadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const downloadSpeedMBps = contentLength
      ? (parseFloat(fileSizeMB) / parseFloat(downloadTime)).toFixed(2)
      : 'unknown';

    logger.log('Video downloaded successfully', {
      fileSizeMB,
      downloadTimeSeconds: downloadTime,
      downloadSpeedMBps,
    });

    // Verify file exists and get its stats before reading
    const fileStats = await fs.stat(tempFilePath);
    const actualFileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);

    logger.log('Reading file from disk to create File object', {
      tempFilePath,
      expectedFileSizeMB: fileSizeMB,
      actualFileSizeMB,
      fileSizeBytes: fileStats.size,
    });

    if (fileStats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    // Read the file from disk and create a File object
    // For large files, this operation may take some time
    const readStartTime = Date.now();
    const fileBuffer = await fs.readFile(tempFilePath);
    const readTime = ((Date.now() - readStartTime) / 1000).toFixed(2);

    // Verify buffer was read correctly
    if (fileBuffer.length !== fileStats.size) {
      throw new Error(
        `Buffer size mismatch: expected ${fileStats.size} bytes, got ${fileBuffer.length} bytes`
      );
    }

    logger.log('File read from disk completed', {
      bufferSizeMB: (fileBuffer.length / (1024 * 1024)).toFixed(2),
      readTimeSeconds: readTime,
      bufferSizeBytes: fileBuffer.length,
    });

    const contentType = response.headers.get('content-type') || 'video/mp4';

    // Extract filename from URL or use default
    // Parse URL to handle query strings and fragments properly
    let filename = 'new-video.mp4';
    try {
      const url = new URL(downloadUrl);
      const pathname = url.pathname;
      const lastSegment = pathname.split('/').filter(Boolean).pop();
      if (lastSegment) {
        filename = decodeURIComponent(lastSegment) || 'new-video.mp4';
      }
    } catch {
      // Fallback: strip query/fragment manually if URL parsing fails
      const withoutQuery = downloadUrl.split('?')[0].split('#')[0];
      const lastSegment = withoutQuery.split('/').filter(Boolean).pop();
      if (lastSegment) {
        try {
          filename = decodeURIComponent(lastSegment) || 'new-video.mp4';
        } catch {
          filename = lastSegment || 'new-video.mp4';
        }
      }
    }

    // Create File object from buffer
    logger.log('Creating File object from buffer', {
      bufferSizeMB: (fileBuffer.length / (1024 * 1024)).toFixed(2),
      filename,
      contentType,
    });

    const blob = new Blob([fileBuffer], { type: contentType });
    const file = new File([blob], filename, { type: contentType });

    logger.log('File object created successfully', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    return file;
  } catch (error: any) {
    logger.error('Error downloading video', {
      error: error?.message || 'Unknown error',
      downloadUrl,
    });
    throw error;
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary file', {
          tempFilePath,
          error: cleanupError,
        });
      }
    }
  }
};
