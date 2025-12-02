import { logger } from '@trigger.dev/sdk/v3';
import { TokenMetadataJson } from '../ipfs/types';
import { MuxTokenInfo } from './filterMuxTokens';
import { ArweaveUploadResult } from './uploadVideosToArweaveBatch';

export interface MetadataUpdate {
  tokenId: string;
  originalMetadata: TokenMetadataJson;
  updatedMetadata: TokenMetadataJson;
  arweaveUri: string;
}

/**
 * Prepares updated metadata objects for all tokens.
 * Replaces MUX URLs with Arweave URIs.
 */
export function prepareMetadataUpdates(
  muxTokens: MuxTokenInfo[],
  uploadMap: Map<string, ArweaveUploadResult>
): MetadataUpdate[] {
  const updates: MetadataUpdate[] = [];

  for (const { tokenId, metadata, downloadUrl } of muxTokens) {
    const uploadResult = uploadMap.get(downloadUrl);

    if (!uploadResult) {
      logger.warn(
        `No upload result found for token ${tokenId} with download URL ${downloadUrl}`
      );
      continue;
    }

    const { arweaveUri, videoFile } = uploadResult;
    const mimeType = metadata.content?.mime || videoFile.type || 'video/mp4';

    const updatedMetadata: TokenMetadataJson = {
      ...metadata,
      animation_url: arweaveUri,
      content: {
        mime: mimeType,
        uri: arweaveUri,
      },
    };

    updates.push({
      tokenId,
      originalMetadata: metadata,
      updatedMetadata,
      arweaveUri,
    });
  }

  logger.log('Metadata updates prepared', {
    tokenCount: updates.length,
  });

  return updates;
}
