import { logger } from '@trigger.dev/sdk/v3';
import { Address } from 'viem';
import { identifyTokenUris } from './identifyTokenUris';
import { fetchTokenMetadataBatch } from './fetchTokenMetadataBatch';
import { filterMuxTokens } from './filterMuxTokens';
import { downloadMuxVideosBatch } from './downloadMuxVideosBatch';
import { uploadVideosToArweaveBatch } from './uploadVideosToArweaveBatch';
import { prepareMetadataUpdates } from './prepareMetadataUpdates';
import { uploadMetadataBatch } from './uploadMetadataBatch';
import { updateTokenMetadataOnChain } from './updateTokenMetadataOnChain';
import { deleteMuxAssetsBatch } from './deleteMuxAssetsBatch';

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
      collectionAddress,
      tokenCount: tokenIds.length,
      chainId,
      artistAddress,
    });

    // Step 1: Identify token URIs
    const tokenUriMap = await identifyTokenUris(
      collectionAddress,
      tokenIds,
      chainId
    );

    // Step 2: Fetch metadata (deduplicated by URI)
    const metadataMap = await fetchTokenMetadataBatch(tokenIds, tokenUriMap);

    if (metadataMap.size === 0) {
      throw new Error('No token metadata found');
    }

    // Step 3: Filter tokens with MUX URLs
    const muxTokens = filterMuxTokens(metadataMap);

    if (muxTokens.length === 0) {
      throw new Error('No tokens with MUX URLs found');
    }

    // Step 4: Download videos from MUX (deduplicated by download URL)
    const downloadUrls = muxTokens.map((token) => token.downloadUrl);
    const videoMap = await downloadMuxVideosBatch(downloadUrls);

    // Step 5: Upload videos to Arweave (deduplicated)
    const uploadMap = await uploadVideosToArweaveBatch(videoMap);

    // Step 6: Prepare metadata updates
    const metadataUpdates = prepareMetadataUpdates(muxTokens, uploadMap);

    if (metadataUpdates.length === 0) {
      throw new Error('No metadata updates prepared');
    }

    // Step 7: Upload updated metadata to Arweave
    const metadataUriMap = await uploadMetadataBatch(metadataUpdates);

    // Step 8: Update token metadata on-chain (batch transaction)
    const transactionHash = await updateTokenMetadataOnChain(
      collectionAddress,
      metadataUriMap,
      chainId,
      artistAddress,
      metadataMap
    );

    // Step 9: Delete MUX assets (after successful transaction)
    const deletionResults = await deleteMuxAssetsBatch(muxTokens);

    const failedDeletions = deletionResults.filter((r) => !r.success);
    if (failedDeletions.length > 0) {
      logger.warn('Some MUX asset deletions failed', {
        failedCount: failedDeletions.length,
        failedTokens: failedDeletions.map((r) => r.tokenId),
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
      stack: error?.stack,
    });
    throw new Error(
      `Failed to migrate MUX to Arweave: ${error?.message || 'Unknown error'}`
    );
  }
}
