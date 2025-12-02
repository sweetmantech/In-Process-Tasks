import { logger } from '@trigger.dev/sdk/v3';
import { Address } from 'viem';
import getUris from '../viem/getUris';

/**
 * Identifies token URIs for the given token IDs.
 * Uses multicall to batch fetch all URIs efficiently.
 */
export async function identifyTokenUris(
  collectionAddress: Address,
  tokenIds: string[],
  chainId: number
): Promise<Record<string, string>> {
  logger.log('Identifying token URIs', {
    tokenCount: tokenIds.length,
  });

  const tokenUriMap = await getUris(collectionAddress, tokenIds, chainId);

  // Identify tokens that don't have URIs
  const tokensWithoutUris = tokenIds.filter((tokenId) => !tokenUriMap[tokenId]);

  logger.log('Token URIs identified', {
    urisFound: Object.keys(tokenUriMap).length,
    tokensWithoutUrisCount: tokensWithoutUris.length,
  });

  if (tokensWithoutUris.length > 0) {
    logger.warn('Some tokens do not have URIs and will be skipped', {
      skippedCount: tokensWithoutUris.length,
    });
  }

  return tokenUriMap;
}
