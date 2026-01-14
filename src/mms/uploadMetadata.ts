import { uploadJson } from '../arweave/uploadJson';
import { InboundMessagePayload } from 'telnyx/resources/shared.mjs';
import getMediaBlob from './getMediaBlob';
import uploadToArweave from '../arweave/uploadToArweave';
import { createMuxUpload } from '../mux/createMuxUpload';
import getAssetInfo from '../mux/getAssetInfo';
import { downloadVideo } from '../mux/downloadVideo';

const uploadMetadata = async (
  media: InboundMessagePayload.Media,
  payload: InboundMessagePayload | undefined
) => {
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
    const buffer = await blob.arrayBuffer();
    const upload = await createMuxUpload();
    const uploadResponse = await fetch(upload.url, {
      method: 'PUT',
      body: buffer as BodyInit,
      headers: {
        'Content-Type': content_type,
      },
    });
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload video to Mux');
    }
    const assetInfo = await getAssetInfo(upload.id);
    if (!assetInfo) {
      throw new Error('Failed to get asset info from Mux');
    }
    const file = await downloadVideo(assetInfo.downloadUrl);
    const mediaUri = await uploadToArweave(file);
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
