import { logger } from '@trigger.dev/sdk/v3';
import { Address } from 'viem';
import { identifyTokenUris } from '../ipfs/identifyTokenUris';
import { fetchTokenMetadataBatch } from '../ipfs/fetchTokenMetadataBatch';
import { filterMuxTokens } from '../ipfs/filterMuxTokens';
import { downloadMuxVideosBatch } from '../mux/downloadMuxVideosBatch';
import { uploadVideosToArweaveBatch } from '../arweave/uploadVideosToArweaveBatch';
import { prepareMetadataUpdates } from '../arweave/prepareMetadataUpdates';
import { uploadMetadataBatch } from '../arweave/uploadMetadataBatch';
import { updateTokenMetadataOnChain } from '../coinbase/updateTokenMetadataOnChain';
import { deleteMuxAssetsBatch } from '../mux/deleteMuxAssetsBatch';

export interface MigrateMuxToArweaveInput {
  collectionAddress: Address;
  tokenIds: string[];
  chainId: number;
  artistAddress: Address;
}

export interface MigrateMuxToArweaveResult {
  success: boolean;
  tokenId: string;
  arweaveUri: string;
  metadataUri: string;
}

export interface MigrateMuxToArweaveResults {
  success: boolean;
  transactionHash: string;
  results: MigrateMuxToArweaveResult[];
}

/**
 * Migrates videos from MUX to Arweave for multiple tokens.
 *
 * Architecture:
 * 1. Identify token URIs
 * 2. Fetch metadata (deduplicated by URI)
 * 3. Filter tokens with MUX URLs
 * 4. Download videos from MUX (deduplicated by download URL)
 * 5. Upload videos to Arweave (deduplicated)
 * 6. Prepare metadata updates
 * 7. Upload updated metadata to Arweave
 * 8. Update token metadata on-chain (batch transaction)
 * 9. Delete MUX assets
 */
export async function migrateMuxToArweave({
  collectionAddress,
  tokenIds,
  chainId,
  artistAddress,
}: MigrateMuxToArweaveInput): Promise<MigrateMuxToArweaveResults> {
  try {
    logger.log('Starting MUX to Arweave migration', {
      tokenCount: tokenIds.length,
      chainId,
    });

    // Step 1: Identify token URIs
    const tokenUriMap = await identifyTokenUris(
      collectionAddress,
      tokenIds,
      chainId
    );

    logger.log('Step 1 completed: Token URIs identified', {
      urisFound: Object.keys(tokenUriMap).length,
    });

    // Step 2: Fetch metadata (deduplicated by URI)
    const metadataMap = await fetchTokenMetadataBatch(tokenIds, tokenUriMap);

    logger.log('Step 2 completed: Metadata fetched', {
      metadataCount: metadataMap.size,
    });

    if (metadataMap.size === 0) {
      throw new Error('No token metadata found');
    }

    // Step 3: Filter tokens with MUX URLs
    const muxTokens = filterMuxTokens(metadataMap);

    if (muxTokens.length === 0) {
      throw new Error('No tokens with MUX URLs found');
    }

    logger.log('Step 3 completed: MUX tokens filtered', {
      muxTokenCount: muxTokens.length,
    });

    // Step 4: Download videos from MUX (deduplicated by download URL)
    const downloadUrls = muxTokens.map((token) => token.downloadUrl);
    const videoMap = await downloadMuxVideosBatch(downloadUrls);

    // Map download URLs back to tokenIds for logging
    const downloadUrlToTokenIds = new Map<string, string[]>();
    for (const token of muxTokens) {
      if (!downloadUrlToTokenIds.has(token.downloadUrl)) {
        downloadUrlToTokenIds.set(token.downloadUrl, []);
      }
      downloadUrlToTokenIds.get(token.downloadUrl)!.push(token.tokenId);
    }

    logger.log('Step 4 completed: Videos downloaded', {
      uniqueVideos: videoMap.size,
    });

    // Step 5: Upload videos to Arweave (deduplicated)
    const uploadMap = await uploadVideosToArweaveBatch(videoMap);

    logger.log('Step 5 completed: Videos uploaded to Arweave', {
      uniqueUploads: uploadMap.size,
    });

    // Step 6: Prepare metadata updates
    const metadataUpdates = prepareMetadataUpdates(muxTokens, uploadMap);

    if (metadataUpdates.length === 0) {
      throw new Error('No metadata updates prepared');
    }

    logger.log('Step 6 completed: Metadata updates prepared', {
      updateCount: metadataUpdates.length,
    });

    // Step 7: Upload updated metadata to Arweave
    const metadataUriMap = await uploadMetadataBatch(metadataUpdates);

    logger.log('Step 7 completed: Metadata uploaded to Arweave', {
      tokensWithMetadata: metadataUriMap.size,
    });

    // Step 8: Update token metadata on-chain (batch transaction)
    const transactionHash = await updateTokenMetadataOnChain(
      collectionAddress,
      metadataUriMap,
      chainId,
      artistAddress,
      metadataMap
    );

    logger.log('Step 8 completed: Token metadata updated on-chain', {
      transactionHash,
      tokensUpdated: metadataUriMap.size,
    });

    // Step 9: Delete MUX assets (after successful transaction)
    const deletionResults = await deleteMuxAssetsBatch(muxTokens);

    const failedDeletions = deletionResults.filter((r) => !r.success);
    logger.log('Step 9 completed: MUX assets deletion', {
      successful: deletionResults.length - failedDeletions.length,
      failed: failedDeletions.length,
    });

    if (failedDeletions.length > 0) {
      logger.warn('Some MUX asset deletions failed', {
        failedCount: failedDeletions.length,
      });
    }

    // Prepare results
    const results: MigrateMuxToArweaveResult[] = metadataUpdates.map(
      ({ tokenId, arweaveUri }) => ({
        success: true,
        tokenId,
        arweaveUri,
        metadataUri: metadataUriMap.get(tokenId) || '',
      })
    );

    logger.log('Migration completed successfully', {
      transactionHash,
      tokensMigrated: results.length,
    });

    return {
      success: true,
      transactionHash,
      results,
    };
  } catch (error: any) {
    logger.error('Migration failed', {
      error: error?.message || 'Unknown error',
    });
    throw new Error(
      `Failed to migrate MUX to Arweave: ${error?.message || 'Unknown error'}`
    );
  }
}
