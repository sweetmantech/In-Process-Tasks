import { uploadJson } from '../arweave/uploadJson';
import getMediaBlob from './getMediaBlob';
import uploadToArweave from '../arweave/uploadToArweave';
import processVideoThroughMuxToArweave from './processVideoThroughMuxToArweave';
import { ProcessMmsInput } from '../schemas/processMmsSchema';

const uploadMetadata = async (payload: ProcessMmsInput) => {
  const media = payload.media?.[0];
  if (!media) {
    throw new Error('Media is required');
  }
  const blob = await getMediaBlob(media);
  const name = payload?.subject || payload?.text || `photo-${Date.now()}`;

  let image: string | undefined = undefined;
  let animation_url: string | undefined = undefined;
  let content_uri: string | undefined = undefined;
  let content_type: string = blob.type;

  if (media.content_type?.includes('image')) {
    const file = new File([blob], name, { type: content_type });
    const mediaUri = await uploadToArweave(file);
    image = mediaUri;
    content_uri = mediaUri;
  }
  if (media.content_type?.includes('video')) {
    const { mediaUri, file } = await processVideoThroughMuxToArweave(
      blob,
      content_type
    );
    animation_url = mediaUri;
    content_uri = mediaUri;
    content_type = file.type;
  }
  const arweaveUri = await uploadJson({
    name,
    description: payload?.text || '',
    image,
    animation_url,
    content: {
      mime: media.content_type,
      uri: content_uri,
    },
  });

  return {
    uri: arweaveUri,
    name,
  };
};

export default uploadMetadata;
