import { logger } from '@trigger.dev/sdk/v3';
import { TokenMetadataJson } from '../ipfs/types';
import { MuxTokenInfo } from '../ipfs/filterMuxTokens';
import { ArweaveUploadResult } from '../arweave/uploadVideosToArweaveBatch';

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

  // Group updates by arweaveUri to show deduplication
  const arweaveUriToTokenIds = new Map<string, string[]>();
  for (const { tokenId, arweaveUri } of updates) {
    if (!arweaveUriToTokenIds.has(arweaveUri)) {
      arweaveUriToTokenIds.set(arweaveUri, []);
    }
    arweaveUriToTokenIds.get(arweaveUri)!.push(tokenId);
  }

  logger.log('Metadata updates prepared', {
    tokenCount: updates.length,
    uniqueArweaveUris: arweaveUriToTokenIds.size,
  });

  return updates;
}
