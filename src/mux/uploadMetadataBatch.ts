import { logger } from '@trigger.dev/sdk/v3';
import { uploadJson } from '../arweave/uploadJson';
import { MetadataUpdate } from './prepareMetadataUpdates';

export interface MetadataUploadResult {
  tokenId: string;
  metadataUri: string;
}

/**
 * Uploads all updated metadata JSONs to Arweave in batch.
 * Returns a map of tokenId to metadata URI.
 */
export async function uploadMetadataBatch(
  updates: MetadataUpdate[]
): Promise<Map<string, string>> {
  logger.log('Uploading metadata to Arweave', {
    metadataCount: updates.length,
  });

  // Upload all metadata in parallel
  const uploadPromises = updates.map(async ({ tokenId, updatedMetadata }) => {
    try {
      const metadataUri = await uploadJson(updatedMetadata);

      logger.log(`Uploaded metadata for token ${tokenId}`, {
        metadataUri,
      });

      return { tokenId, metadataUri };
    } catch (error: any) {
      logger.error(`Failed to upload metadata for token ${tokenId}`, {
        error: error?.message || 'Unknown error',
      });
      throw error;
    }
  });

  const results = await Promise.all(uploadPromises);

  // Create a map for easy lookup
  const metadataUriMap = new Map<string, string>();
  for (const { tokenId, metadataUri } of results) {
    metadataUriMap.set(tokenId, metadataUri);
  }

  logger.log('Metadata uploaded to Arweave', {
    successfulUploads: metadataUriMap.size,
  });

  return metadataUriMap;
}
