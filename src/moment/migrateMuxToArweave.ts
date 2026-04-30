import { logger, wait } from '@trigger.dev/sdk/v3';
import { Address } from 'viem';
import getUri from '../viem/getUri';
import { downloadVideo } from '../mux/downloadVideo';
import { transcodeIfH265 } from '../video/transcodeIfH265';
import uploadToArweave from '../arweave/uploadToArweave';
import { uploadJson } from '../arweave/uploadJson';
import { PROBE_PREFIX_BYTES_VIDEO } from '../arweave/probeReadableWithRangePrefix';
import { waitForArweaveGatewayAvailability } from '../arweave/waitForArweaveGatewayAvailability';
import { updateMomentMetadata } from '../moment/updateMomentMetadata';
import { findMuxAssetIdFromPlaybackUrl } from '../mux/findMuxAssetIdFromPlaybackUrl';
import { deleteMuxAsset } from '../mux/deleteMuxAsset';
import { TokenMetadataJson } from '../ipfs/types';
import getMetadata from './getMetadata';

export interface MigrateMuxToArweaveInput {
  collectionAddress: Address;
  tokenId: string;
  chainId: number;
  artistAddress: Address;
}

export interface MigrateMuxToArweaveResult {
  success: boolean;
  tokenId: string;
  arweaveUri: string;
  metadataUri: string;
  transactionHash: string;
}

export async function migrateMuxToArweave({
  collectionAddress,
  tokenId,
  chainId,
  artistAddress,
}: MigrateMuxToArweaveInput): Promise<MigrateMuxToArweaveResult> {
  logger.log('Starting MUX to Arweave migration', { tokenId, chainId });

  // Step 1: Get token URI
  const tokenUri = await getUri(collectionAddress, tokenId, chainId);

  logger.log('Step 1 completed: Token URI identified');

  // Step 2: Fetch metadata
  const metadata = await getMetadata(tokenUri);
  if (!metadata)
    throw new Error(`Failed to fetch metadata for token ${tokenId}`);

  logger.log('Step 2 completed: Metadata fetched');

  // Step 3: Extract and validate MUX URL
  const downloadUrl = metadata.content?.uri;
  if (!downloadUrl) throw new Error(`No content URI for token ${tokenId}`);
  if (!downloadUrl.includes('mux.com'))
    throw new Error(`Token ${tokenId} content URI is not a MUX URL`);

  const playbackUrl =
    typeof metadata.animation_url === 'string' &&
    metadata.animation_url.includes('stream.mux.com')
      ? metadata.animation_url
      : undefined;

  logger.log('Step 3 completed: MUX URL confirmed');

  // Step 4: Download video from MUX
  const videoFile = await downloadVideo(downloadUrl);

  logger.log('Step 4 completed: Video downloaded');

  // Step 5: Transcode H.265 → H.264 if needed
  const transcodedFile = await transcodeIfH265(videoFile);

  logger.log('Step 5 completed: Codec check and transcode done');

  // Step 6: Upload video to Arweave
  const arweaveUri = await uploadToArweave(transcodedFile);
  if (!arweaveUri) throw new Error('Failed to upload video to Arweave');

  logger.log('Step 6 completed: Video uploaded to Arweave', { arweaveUri });

  // Step 7: Build updated metadata and upload JSON to Arweave
  const mimeType = metadata.content?.mime || transcodedFile.type || 'video/mp4';
  const updatedMetadata: TokenMetadataJson = {
    ...metadata,
    animation_url: arweaveUri,
    content: { mime: mimeType, uri: arweaveUri },
  };

  const metadataUri = await uploadJson(updatedMetadata);

  logger.log('Step 7 completed: Metadata JSON uploaded to Arweave', {
    metadataUri,
  });

  // Step 8: Wait until InProcess media stream can serve both ar:// URIs (parallel)
  logger.log('Step 8: Waiting for InProcess media stream (video + metadata)', {
    arweaveUri,
    metadataUri,
  });

  await Promise.all([
    waitForArweaveGatewayAvailability(arweaveUri, {
      probePrefixBytes: PROBE_PREFIX_BYTES_VIDEO,
    }),
    waitForArweaveGatewayAvailability(metadataUri),
  ]);

  logger.log(
    'Step 8 completed: InProcess media stream ready (or sweeps exhausted)',
    {
      arweaveUri,
      metadataUri,
    }
  );

  // Step 9: Update token metadata onchain
  const transactionHash = await updateMomentMetadata(
    collectionAddress,
    tokenId,
    metadataUri,
    chainId,
    artistAddress,
    metadata
  );

  logger.log('Step 9 completed: Token metadata updated onchain', {
    transactionHash,
  });

  // Step 10: Delete MUX asset after grace period so active clients can switch to Arweave URL
  if (playbackUrl) {
    const assetId = await findMuxAssetIdFromPlaybackUrl(playbackUrl);
    if (assetId) {
      await wait.for({ seconds: 30 });
      await deleteMuxAsset(assetId);
      logger.log('Step 10 completed: MUX asset deleted', { assetId });
    }
  }

  logger.log('Migration completed successfully', {
    tokenId,
    arweaveUri,
    metadataUri,
    transactionHash,
  });

  return { success: true, tokenId, arweaveUri, metadataUri, transactionHash };
}
