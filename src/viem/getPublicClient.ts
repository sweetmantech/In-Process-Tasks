import { createPublicClient, http, PublicClient } from 'viem';
import getViemNetwork from '../viem/getViemNetwork';

export const getPublicClient = (chainId: number) => {
  const chain = getViemNetwork(chainId) as any;
  return createPublicClient({
    chain,
    transport: http(),
  }) as PublicClient;
};
