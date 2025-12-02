import { logger } from '@trigger.dev/sdk/v3';
import { fetchTokenMetadata } from './fetchTokenMetadata';
import { TokenMetadataJson } from '../ipfs/types';

/**
 * Fetches token metadata for multiple tokens in parallel.
 * Filters out tokens without URIs and returns a map of tokenId to metadata.
 * Deduplicates URI calls - tokens with the same URI will share the same fetch.
 */
export async function fetchTokenMetadataBatch(
  tokenIds: string[],
  tokenUriMap: Record<string, string>
): Promise<Map<string, TokenMetadataJson>> {
  // Group tokenIds by their URI to avoid duplicate fetches
  const uriToTokenIds = new Map<string, string[]>();

  for (const tokenId of tokenIds) {
    const tokenUri = tokenUriMap[tokenId];
    if (!tokenUri) {
      logger.warn(`Skipping token ${tokenId}: no token URI found`);
      continue;
    }

    if (!uriToTokenIds.has(tokenUri)) {
      uriToTokenIds.set(tokenUri, []);
    }
    uriToTokenIds.get(tokenUri)!.push(tokenId);
  }

  // Fetch each unique URI only once
  const metadataPromises = Array.from(uriToTokenIds.entries()).map(
    async ([uri, tokenIdsForUri]) => {
      const metadata = await fetchTokenMetadata(uri);
      if (!metadata) {
        throw new Error(
          `Failed to fetch current token metadata for URI ${uri}`
        );
      }
      return { uri, metadata, tokenIdsForUri };
    }
  );

  const metadataResults = await Promise.all(metadataPromises);

  // Map results back to all tokenIds that share each URI
  const metadataMap = new Map<string, TokenMetadataJson>();
  for (const { metadata, tokenIdsForUri } of metadataResults) {
    for (const tokenId of tokenIdsForUri) {
      metadataMap.set(tokenId, metadata);
    }
  }

  return metadataMap;
}
