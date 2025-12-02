import { logger } from '@trigger.dev/sdk/v3';
import { downloadVideo } from './downloadVideo';

export interface VideoDownloadResult {
  downloadUrl: string;
  videoFile: File;
}

/**
 * Downloads videos from MUX in batch with limited concurrency to prevent memory issues.
 * Avoids duplicate downloads.
 * Returns a map of downloadUrl to VideoDownloadResult.
 *
 * @param downloadUrls - Array of download URLs
 * @param concurrency - Maximum number of concurrent downloads (default: 2)
 */
export async function downloadMuxVideosBatch(
  downloadUrls: string[],
  concurrency: number = 2
): Promise<Map<string, VideoDownloadResult>> {
  // Deduplicate download URLs
  const uniqueUrls = Array.from(new Set(downloadUrls));

  // Group original URLs to show which tokens share downloads
  const urlToCount = new Map<string, number>();
  for (const url of downloadUrls) {
    urlToCount.set(url, (urlToCount.get(url) || 0) + 1);
  }

  logger.log('Downloading MUX videos', {
    uniqueUrls: uniqueUrls.length,
    concurrency,
  });

  // Download with limited concurrency to prevent memory issues
  // Process downloads in batches to avoid loading too many large files into memory
  const results: Array<{ downloadUrl: string; videoFile: File }> = [];

  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);

    const batchPromises = batch.map(async (downloadUrl) => {
      try {
        const videoFile = await downloadVideo(downloadUrl);
        return { downloadUrl, videoFile };
      } catch (error: any) {
        logger.error('Failed to download video', {
          error: error?.message || 'Unknown error',
          downloadUrl,
        });
        throw error;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    logger.log('Download batch completed', {
      batchNumber: Math.floor(i / concurrency) + 1,
      totalBatches: Math.ceil(uniqueUrls.length / concurrency),
      completed: results.length,
      total: uniqueUrls.length,
    });
  }

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
