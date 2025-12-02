import { zoraCreator1155ImplABI } from '@zoralabs/protocol-deployments';
import { getPublicClient } from './getPublicClient';
import { Address } from 'viem';
import { logger } from '@trigger.dev/sdk';

/**
 * Batch fetch multiple token URIs at once using multicall
 * @param collectionAddress - The contract address
 * @param tokenIds - Array of token IDs to fetch URIs for
 * @param chainId - The chain ID
 * @returns Promise resolving to a map of tokenId to tokenUri (only successful ones)
 */
const getUris = async (
  collectionAddress: Address,
  tokenIds: string[],
  chainId: number
): Promise<Record<string, string>> => {
  const publicClient: any = getPublicClient(chainId);

  // Use multicall to batch all RPC calls together
  // When tokenId = 0, call contractURI instead of uri
  const tokenUris = await publicClient.multicall({
    contracts: tokenIds.map((tokenId) => ({
      address: collectionAddress,
      abi: zoraCreator1155ImplABI,
      functionName: tokenId === '0' ? 'contractURI' : 'uri',
      args: tokenId === '0' ? [] : [tokenId],
    })),
  });

  // Create a map of tokenId to tokenUri, only including successful results
  const uriMap: Record<string, string> = {};
  const failedTokens: Array<{ tokenId: string; reason: string }> = [];

  tokenIds.forEach((tokenId, index) => {
    const result = tokenUris[index];
    if (result.status === 'success' && result.result) {
      uriMap[tokenId] = result.result;
    } else {
      const reason =
        result.status === 'failure'
          ? `RPC call failed: ${result.error?.message || 'Unknown error'}`
          : result.result === null || result.result === undefined
            ? 'URI is null or undefined'
            : result.result === ''
              ? 'URI is empty string'
              : 'Unknown reason';
      failedTokens.push({ tokenId, reason });
    }
  });

  // Log failed tokens if any
  if (failedTokens.length > 0) {
    console.warn('Some tokens failed to fetch URIs:', {
      failedCount: failedTokens.length,
    });
  }

  return uriMap;
};

export default getUris;
