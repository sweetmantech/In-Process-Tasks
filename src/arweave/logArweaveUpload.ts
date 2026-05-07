import { logger } from '@trigger.dev/sdk/v3';
import { unauthTurboClient } from './turboClient';
import type { ArweaveUploadResult } from './uploadToArweave';
import { getSupabaseClient } from '../supabase/client';
import ensureArtist from './ensureArtist';

type UploadMeta = {
  file_size_bytes: number;
  content_type: string;
  artist_address: string;
};

const logArweaveUpload = async (
  result: ArweaveUploadResult,
  meta: UploadMeta
): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    await ensureArtist(meta.artist_address);
    const { tokenPrice } = await unauthTurboClient.getTokenPriceForBytes({
      byteCount: meta.file_size_bytes,
    });

    const { error } = await supabase.from('in_process_arweave_uploads').upsert(
      {
        arweave_uri: result.arweave_uri,
        winc_cost: result.winc_cost,
        usdc_cost: Number(tokenPrice),
        file_size_bytes: meta.file_size_bytes,
        content_type: meta.content_type,
        artist_address: meta.artist_address.toLowerCase(),
      },
      { onConflict: 'arweave_uri', ignoreDuplicates: true }
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error('logArweaveUpload failed', {
      error: error instanceof Error ? error.message : String(error),
      arweaveUri: result.arweave_uri,
      artistAddress: meta.artist_address,
    });
  }
};

export default logArweaveUpload;
