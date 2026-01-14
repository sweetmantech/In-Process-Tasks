import { v4 as uuidv4 } from 'uuid';
import mux from './mux';
/**
 * Creates a Mux upload with standard settings including static renditions.
 * Returns the upload object with url and id.
 */
export const createMuxUpload = async () => {
  const id = uuidv4();
  const upload = await mux.video.uploads.create({
    cors_origin: '*',
    new_asset_settings: {
      passthrough: id,
      playback_policy: ['public'],
      video_quality: 'basic',
      static_renditions: [{ resolution: 'highest' }],
      master_access: 'temporary',
    },
  });

  if (!upload.url || !upload.id) {
    throw new Error('Failed to create Mux upload');
  }

  return upload;
};
