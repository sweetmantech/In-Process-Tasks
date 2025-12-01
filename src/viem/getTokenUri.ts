import { getPublicClient } from './getPublicClient';
import { erc1155Abi } from 'viem';
import { Address } from 'viem';

const getTokenUri = async (
  tokenContract: Address,
  tokenId: string,
  chainId: number
) => {
  const publicClient: any = getPublicClient(chainId);

  const tokenUri = await publicClient.readContract({
    address: tokenContract,
    abi: erc1155Abi,
    functionName: 'uri',
    args: [tokenId],
  });

  return tokenUri;
};

export default getTokenUri;
