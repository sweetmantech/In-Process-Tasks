import { logger } from '@trigger.dev/sdk/v3';
import { TokenMetadataJson } from '../ipfs/types';

export interface MuxTokenInfo {
  tokenId: string;
  metadata: TokenMetadataJson;
  downloadUrl: string;
  playbackUrl?: string;
}

/**
 * Filters tokens that have MUX URLs in their content.uri.
 * Returns only tokens that need migration.
 */
export function filterMuxTokens(
  metadataMap: Map<string, TokenMetadataJson>
): MuxTokenInfo[] {
  const muxTokens: MuxTokenInfo[] = [];

  for (const [tokenId, metadata] of metadataMap.entries()) {
    const downloadUrl = metadata.content?.uri;

    if (!downloadUrl) {
      logger.warn(`Skipping token ${tokenId}: no content URI found`);
      continue;
    }

    // Check if it's a MUX URL (download URL or playback URL)
    const isMuxUrl =
      downloadUrl.includes('mux.com') || downloadUrl.includes('stream.mux.com');

    if (!isMuxUrl) {
      logger.warn(`Skipping token ${tokenId}: content URI is not a MUX URL`);
      continue;
    }

    const playbackUrl = metadata.animation_url;
    const hasMuxPlaybackUrl =
      playbackUrl && playbackUrl.includes('stream.mux.com');

    muxTokens.push({
      tokenId,
      metadata,
      downloadUrl,
      playbackUrl: hasMuxPlaybackUrl ? playbackUrl : undefined,
    });
  }

  logger.log('Filtered MUX tokens', {
    totalTokens: metadataMap.size,
    muxTokensFound: muxTokens.length,
  });

  return muxTokens;
}
