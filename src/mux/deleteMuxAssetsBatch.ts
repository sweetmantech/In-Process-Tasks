import { logger } from '@trigger.dev/sdk/v3';
import { deleteMuxAsset } from './deleteMuxAsset';
import { findMuxAssetIdFromPlaybackUrl } from './findMuxAssetIdFromPlaybackUrl';
import { MuxTokenInfo } from '../ipfs/filterMuxTokens';

export interface MuxDeletionResult {
  tokenId: string;
  assetId?: string;
  success: boolean;
  error?: string;
}

/**
 * Deletes MUX assets in batch.
 * Handles errors gracefully - failures don't stop the process.
 */
export async function deleteMuxAssetsBatch(
  muxTokens: MuxTokenInfo[]
): Promise<MuxDeletionResult[]> {
  // Filter tokens that have playback URLs
  const tokensToDelete = muxTokens.filter(
    (token) => token.playbackUrl && token.playbackUrl.includes('stream.mux.com')
  );

  if (tokensToDelete.length === 0) {
    logger.log('No MUX assets to delete');
    return [];
  }

  logger.log('Deleting MUX assets', {
    assetCount: tokensToDelete.length,
  });

  // Delete all assets in parallel
  const deletionPromises = tokensToDelete.map(
    async ({ tokenId, playbackUrl }) => {
      try {
        if (!playbackUrl) {
          return {
            tokenId,
            success: false,
            error: 'No playback URL provided',
          };
        }

        const assetId = await findMuxAssetIdFromPlaybackUrl(playbackUrl);

        if (!assetId) {
          return {
            tokenId,
            success: false,
            error: 'Asset ID not found',
          };
        }

        await deleteMuxAsset(assetId);

        return {
          tokenId,
          assetId,
          success: true,
        };
      } catch (error: any) {
        return {
          tokenId,
          success: false,
          error: error?.message || 'Unknown error',
        };
      }
    }
  );

  const results = await Promise.all(deletionPromises);

  const successful = results.filter((r) => r.success).length;
  logger.log('MUX asset deletion completed', {
    total: results.length,
    successful,
    failed: results.length - successful,
  });

  return results;
}
