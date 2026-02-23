import { logger } from '@trigger.dev/sdk/v3';
import { VideoDownloadResult } from '../mux/downloadMuxVideosBatch';
import { transcodeIfH265 } from './transcodeIfH265';

/**
 * Iterates a videoMap and transcodes any H.265 videos to H.264 MP4.
 * Non-H.265 videos are passed through unchanged.
 * Returns a new map with the same keys but potentially updated File objects.
 */
export async function transcodeVideosIfNeededBatch(
  videoMap: Map<string, VideoDownloadResult>
): Promise<Map<string, VideoDownloadResult>> {
  logger.log('Checking videos for H.265 codec', {
    videoCount: videoMap.size,
  });

  const entries = Array.from(videoMap.entries());

  const processedEntries = await Promise.all(
    entries.map(async ([downloadUrl, result]) => {
      const transcodedFile = await transcodeIfH265(result.videoFile);
      return [downloadUrl, { ...result, videoFile: transcodedFile }] as [
        string,
        VideoDownloadResult,
      ];
    })
  );

  const transcodedMap = new Map<string, VideoDownloadResult>(processedEntries);

  const transcodedCount = processedEntries.filter(
    ([, result], i) => result.videoFile !== entries[i][1].videoFile
  ).length;

  logger.log('Transcode check completed', {
    total: transcodedMap.size,
    transcoded: transcodedCount,
    skipped: transcodedMap.size - transcodedCount,
  });

  return transcodedMap;
}
