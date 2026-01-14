import mux from './mux';

const getAssetInfo = async (uploadId: string) => {
  const retryDelay = 2000;

  while (true) {
    try {
      const uploadData = await mux.video.uploads.retrieve(uploadId);

      if (uploadData.asset_id) {
        const asset = await mux.video.assets.retrieve(uploadData.asset_id);

        // Check if asset is ready
        if (
          asset.status === 'ready' &&
          asset.playback_ids &&
          asset.playback_ids.length > 0
        ) {
          const playbackId = asset.playback_ids[0].id;
          const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;

          // Use master URL (already MP4)
          if (asset.master?.status === 'ready' && asset.master?.url) {
            return {
              playbackUrl,
              downloadUrl: asset.master.url,
              assetId: asset.id,
            };
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    } catch (error: any) {
      if (
        error.message?.includes('processing') ||
        error.message?.includes('Asset is being') ||
        error.message?.includes('not found')
      ) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      throw error;
    }
  }
};

export default getAssetInfo;
