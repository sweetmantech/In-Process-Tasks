import { getSupabaseClient } from './client';

type ArweaveUploadRecord = {
  arweave_uri: string;
  winc_cost: string;
  usdc_cost: number;
  file_size_bytes: number;
  content_type: string;
  artist_address: string;
};

const upsertArweaveUpload = async (
  record: ArweaveUploadRecord
): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('in_process_arweave_uploads')
    .upsert(record, { onConflict: 'arweave_uri', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
};

export default upsertArweaveUpload;
