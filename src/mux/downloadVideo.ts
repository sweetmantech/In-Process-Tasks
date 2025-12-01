import { logger } from '@trigger.dev/sdk';

/**
 * Downloads a video file from MUX using the asset's master download URL
 *
 * @param downloadUrl - The MUX asset's master download URL
 * @returns A File object containing the downloaded video
 * @throws Error if download fails
 */
export const downloadVideo = async (downloadUrl: string): Promise<File> => {
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download video from MUX: ${response.statusText}`
    );
  }

  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || 'video/mp4';

  logger.log('Downloaded video content type', { contentType });

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

  return new File([blob], filename, { type: contentType });
};
