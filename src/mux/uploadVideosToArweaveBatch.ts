import { logger } from '@trigger.dev/sdk/v3';
import uploadToArweave from '../arweave/uploadToArweave';
import { VideoDownloadResult } from './downloadMuxVideosBatch';

export interface ArweaveUploadResult {
  downloadUrl: string;
  arweaveUri: string;
  videoFile: File;
}

/**
 * Uploads videos to Arweave in batch, avoiding duplicate uploads.
 * Uses file content hash or URL to deduplicate.
 * Returns a map of downloadUrl to ArweaveUploadResult.
 */
export async function uploadVideosToArweaveBatch(
  videoMap: Map<string, VideoDownloadResult>
): Promise<Map<string, ArweaveUploadResult>> {
  logger.log('Uploading videos to Arweave', {
    videoCount: videoMap.size,
  });

  // Upload all videos in parallel
  const uploadPromises = Array.from(videoMap.entries()).map(
    async ([downloadUrl, { videoFile }]) => {
      try {
        const arweaveUri = await uploadToArweave(videoFile);

        if (!arweaveUri) {
          throw new Error(
            `Failed to upload video to Arweave for ${downloadUrl}`
          );
        }

        return {
          downloadUrl,
          arweaveUri,
          videoFile,
        };
      } catch (error: any) {
        logger.error(`Failed to upload video to Arweave`, {
          error: error?.message || 'Unknown error',
        });
        throw error;
      }
    }
  );

  const results = await Promise.all(uploadPromises);

  // Create a map for easy lookup
  const uploadMap = new Map<string, ArweaveUploadResult>();
  for (const result of results) {
    uploadMap.set(result.downloadUrl, result);
  }

  logger.log('Videos uploaded to Arweave', {
    successfulUploads: uploadMap.size,
  });

  return uploadMap;
}
