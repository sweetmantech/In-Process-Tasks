import uploadToArweave from '../arweave/uploadToArweave';
import { createMuxUpload } from '../mux/createMuxUpload';
import getAssetInfo from '../mux/getAssetInfo';
import { downloadVideo } from '../mux/downloadVideo';

const processVideoThroughMuxToArweave = async (
  blob: Blob,
  content_type: string
): Promise<{ mediaUri: string; file: File }> => {
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
  return { mediaUri, file };
};

export default processVideoThroughMuxToArweave;
