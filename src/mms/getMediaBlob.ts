import { InboundMessagePayload } from 'telnyx/resources/shared.mjs';

const getMediaBlob = async (
  photo: InboundMessagePayload.Media
): Promise<Blob> => {
  if (!photo.url) {
    throw new Error('Photo URL is missing');
  }

  const response = await fetch(photo.url);

  if (!response.ok) {
    throw new Error(
      `Failed to download photo: ${response.status} ${response.statusText}`
    );
  }

  const blob = await response.blob();
  return blob;
};

export default getMediaBlob;
