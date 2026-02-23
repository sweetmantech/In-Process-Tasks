import { zoraCreator1155ImplABI } from '@zoralabs/protocol-deployments';
import { getPublicClient } from './getPublicClient';
import { Address } from 'viem';

/**
 * Fetches the token URI for a single token.
 * Uses contractURI for tokenId "0", uri for all others.
 */
const getUri = async (
  collectionAddress: Address,
  tokenId: string,
  chainId: number
): Promise<string> => {
  const publicClient: any = getPublicClient(chainId);

  const uri = await publicClient.readContract({
    address: collectionAddress,
    abi: zoraCreator1155ImplABI,
    functionName: tokenId === '0' ? 'contractURI' : 'uri',
    args: tokenId === '0' ? [] : [tokenId],
  });

  if (!uri) throw new Error(`No URI found for token ${tokenId}`);

  return uri;
};

export default getUri;
