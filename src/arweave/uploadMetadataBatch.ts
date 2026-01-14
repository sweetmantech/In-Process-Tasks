import { logger } from '@trigger.dev/sdk/v3';
import { uploadJson } from './uploadJson';
import { MetadataUpdate } from './prepareMetadataUpdates';

export interface MetadataUploadResult {
  tokenId: string;
  metadataUri: string;
}

/**
 * Uploads all updated metadata JSONs to Arweave in batch.
 * Deduplicates uploads - tokens with identical metadata content will share the same upload.
 * Returns a map of tokenId to metadata URI.
 */
export async function uploadMetadataBatch(
  updates: MetadataUpdate[]
): Promise<Map<string, string>> {
  logger.log('Uploading metadata to Arweave', {
    metadataCount: updates.length,
  });

  // Group updates by metadata content to deduplicate uploads
  const metadataContentToTokenIds = new Map<string, string[]>();
  const metadataContentToMetadata = new Map<
    string,
    MetadataUpdate['updatedMetadata']
  >();

  for (const update of updates) {
    // Create a unique key from the metadata content
    const metadataKey = JSON.stringify(update.updatedMetadata);

    if (!metadataContentToTokenIds.has(metadataKey)) {
      metadataContentToTokenIds.set(metadataKey, []);
      metadataContentToMetadata.set(metadataKey, update.updatedMetadata);
    }

    metadataContentToTokenIds.get(metadataKey)!.push(update.tokenId);
  }

  // Upload each unique metadata only once
  const uploadPromises = Array.from(metadataContentToTokenIds.entries()).map(
    async ([metadataKey, tokenIds]) => {
      const metadata = metadataContentToMetadata.get(metadataKey)!;

      try {
        const metadataUri = await uploadJson(metadata);
        return { tokenIds, metadataUri };
      } catch (error: any) {
        logger.error('Failed to upload metadata', {
          error: error?.message || 'Unknown error',
        });
        throw error;
      }
    }
  );

  const results = await Promise.all(uploadPromises);

  // Create a map for easy lookup - all tokenIds sharing the same metadata get the same URI
  const metadataUriMap = new Map<string, string>();
  for (const { tokenIds, metadataUri } of results) {
    for (const tokenId of tokenIds) {
      metadataUriMap.set(tokenId, metadataUri);
    }
  }

  logger.log('Metadata uploaded to Arweave', {
    successfulUploads: metadataUriMap.size,
    uniqueUploads: results.length,
  });

  return metadataUriMap;
}
