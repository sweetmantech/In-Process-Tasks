import { logger } from '@trigger.dev/sdk/v3';
import { Address } from 'viem';
import { downloadVideo } from './downloadVideo';
import { deleteMuxAsset } from './deleteMuxAsset';
import { findMuxAssetIdFromPlaybackUrl } from './findMuxAssetIdFromPlaybackUrl';
import { fetchTokenMetadata } from './fetchTokenMetadata';
import getTokenUri from '../viem/getTokenUri';
import getUpdateTokenURICall from '../viem/getUpdateTokenURICall';
import uploadToArweave from '../arweave/uploadToArweave';
import { getOrCreateSmartWallet } from '../coinbase/getOrCreateSmartWallet';
import { uploadJson } from '../arweave/uploadJson';
import { baseSepolia } from 'viem/chains';
import { sendUserOperation } from '../coinbase/sendUserOperation';

export interface MigrateMuxToArweaveInput {
  collectionAddress: Address;
  tokenId: string;
  chainId: number;
  artistAddress: Address;
}

export interface MigrateMuxToArweaveResult {
  success: boolean;
  arweaveUri: string;
  transactionHash: string;
}

/**
 * Migrates a video from MUX to Arweave:
 * 1. Gets token URI using viem and fetches metadata from IPFS
 * 2. Extracts download URL from content.uri (validates it's a MUX URL)
 * 3. Downloads video from MUX
 * 4. Uploads video to Arweave
 * 5. Updates token metadata object with Arweave URI (replaces MUX URLs in animation_url and content.uri)
 * 6. Uploads updated metadata JSON to Arweave
 * 7. Updates on-chain token URI via user operation
 * 8. Deletes video from MUX (if playback URL is found)
 */
export async function migrateMuxToArweave({
  collectionAddress,
  tokenId,
  chainId,
  artistAddress,
}: MigrateMuxToArweaveInput): Promise<MigrateMuxToArweaveResult> {
  try {
    // Step 1: Get token info using viem and fetch metadata from IPFS
    const tokenUri = await getTokenUri(collectionAddress, tokenId, chainId);

    logger.log('Token metadata URI', { tokenUri });

    const currentMetadata = await fetchTokenMetadata(tokenUri);
    if (!currentMetadata) {
      throw new Error('Failed to fetch current token metadata');
    }

    logger.log('Current token metadata', { currentMetadata });

    // Step 2: Extract download URL from content.uri (should be MUX download URL)
    const downloadUrl = currentMetadata.content?.uri;
    if (!downloadUrl) {
      throw new Error('Token metadata does not have a content URI');
    }

    logger.log('Download URL', { downloadUrl });

    // Check if it's a MUX URL (download URL or playback URL)
    const isMuxUrl =
      downloadUrl.includes('mux.com') || downloadUrl.includes('stream.mux.com');
    if (!isMuxUrl) {
      throw new Error('Content URI is not a MUX URL - migration not needed');
    }

    // Step 3: Download video from MUX
    const videoFile = await downloadVideo(downloadUrl);

    logger.log('Video file downloaded from MUX', { videoFile });

    // Step 4: Upload video to Arweave
    const arweaveUri = await uploadToArweave(videoFile);

    if (!arweaveUri) {
      throw new Error('Failed to upload video to Arweave');
    }

    logger.log('Video file uploaded to Arweave', { arweaveUri });

    // Step 5: Update metadata with Arweave URI (replace MUX URLs)
    // Preserve existing mime type or default to video/mp4
    const mimeType =
      currentMetadata.content?.mime || videoFile.type || 'video/mp4';

    logger.log('Mime type', { mimeType });

    const updatedMetadata = {
      ...currentMetadata,
      animation_url: arweaveUri,
      content: {
        mime: mimeType,
        uri: arweaveUri,
      },
    };

    // Step 6: Upload updated metadata JSON to Arweave
    const newMetadataUri = await uploadJson(updatedMetadata);

    logger.log('New metadata URI', { newMetadataUri });

    // Step 7: Update on-chain token URI and contract metadata
    const smartAccount = await getOrCreateSmartWallet({
      address: artistAddress,
    });

    const updateTokenURICall = getUpdateTokenURICall(
      collectionAddress,
      tokenId,
      newMetadataUri
    );

    const transaction = await sendUserOperation({
      smartAccount,
      network: chainId === baseSepolia.id ? 'base-sepolia' : 'base',
      calls: [updateTokenURICall],
    });

    logger.log('Transaction hash', {
      transactionHash: transaction.transactionHash,
    });

    // Step 8: Update in_process_tokens table with new metadata URI
    if (transaction && transaction.transactionHash) {
      // Step 9: Delete video from MUX
      const playbackUrl = currentMetadata.animation_url;
      if (playbackUrl && playbackUrl.includes('stream.mux.com')) {
        try {
          const assetId = await findMuxAssetIdFromPlaybackUrl(playbackUrl);
          if (assetId) {
            await deleteMuxAsset(assetId);
          }
        } catch (deleteError) {
          // Log error but don't fail the migration if deletion fails
          console.error(`Failed to delete MUX asset:`, deleteError);
        }
      }
    }

    return {
      success: true,
      arweaveUri,
      transactionHash: transaction.transactionHash,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to migrate MUX to Arweave: ${error?.message || 'Unknown error'}`
    );
  }
}
