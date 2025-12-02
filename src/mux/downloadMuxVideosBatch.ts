import { logger } from '@trigger.dev/sdk/v3';
import { downloadVideo } from './downloadVideo';

export interface VideoDownloadResult {
  downloadUrl: string;
  videoFile: File;
}

/**
 * Downloads videos from MUX in batch, avoiding duplicate downloads.
 * Returns a map of downloadUrl to VideoDownloadResult.
 */
export async function downloadMuxVideosBatch(
  downloadUrls: string[]
): Promise<Map<string, VideoDownloadResult>> {
  // Deduplicate download URLs
  const uniqueUrls = Array.from(new Set(downloadUrls));

  logger.log('Downloading MUX videos', {
    totalUrls: downloadUrls.length,
    uniqueUrls: uniqueUrls.length,
  });

  // Download all unique URLs in parallel
  const downloadPromises = uniqueUrls.map(async (downloadUrl) => {
    try {
      const videoFile = await downloadVideo(downloadUrl);
      logger.log(`Downloaded video from ${downloadUrl}`, {
        fileName: videoFile.name,
        fileType: videoFile.type,
        fileSize: videoFile.size,
      });
      return { downloadUrl, videoFile };
    } catch (error: any) {
      logger.error(`Failed to download video from ${downloadUrl}`, {
        error: error?.message || 'Unknown error',
      });
      throw error;
    }
  });

  const results = await Promise.all(downloadPromises);

  // Create a map for easy lookup
  const videoMap = new Map<string, VideoDownloadResult>();
  for (const result of results) {
    videoMap.set(result.downloadUrl, result);
  }

  logger.log('MUX videos downloaded', {
    successfulDownloads: videoMap.size,
  });

  return videoMap;
}
