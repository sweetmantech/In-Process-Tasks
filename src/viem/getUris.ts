import { zoraCreator1155FactoryImplABI } from '@zoralabs/protocol-deployments';
import { getPublicClient } from './getPublicClient';
import { Address } from 'viem';

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
      abi: zoraCreator1155FactoryImplABI,
      functionName: tokenId === '0' ? 'contractURI' : 'uri',
      args: tokenId === '0' ? [] : [tokenId],
    })),
  });

  // Create a map of tokenId to tokenUri, only including successful results
  const uriMap: Record<string, string> = {};
  tokenIds.forEach((tokenId, index) => {
    const result = tokenUris[index];
    if (result.status === 'success' && result.result) {
      uriMap[tokenId] = result.result;
    }
  });

  return uriMap;
};

export default getUris;
