import { getSupabaseClient } from '../supabase/client';

const ensureArtist = async (artistAddress: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const address = artistAddress.toLowerCase();
  const { error } = await supabase
    .from('in_process_artists')
    .upsert({ address }, { onConflict: 'address', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
};

export default ensureArtist;
