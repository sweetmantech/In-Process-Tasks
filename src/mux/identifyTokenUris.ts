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
    collectionAddress,
    tokenCount: tokenIds.length,
    chainId,
  });

  const tokenUriMap = await getUris(collectionAddress, tokenIds, chainId);

  logger.log('Token URIs identified', {
    totalTokens: tokenIds.length,
    urisFound: Object.keys(tokenUriMap).length,
  });

  return tokenUriMap;
}
