import { createPublicClient, http, PublicClient } from 'viem';
import getViemNetwork from '../viem/getViemNetwork';
import { baseSepolia } from 'viem/chains';
import getAlchemyRpcUrl from '../alchemy/getAlchemyRpcUrl';

export const getPublicClient = (chainId: number) => {
  const chain = getViemNetwork(chainId) as any;
  const RPC_URL = getAlchemyRpcUrl(chainId);
  return createPublicClient({
    chain,
    transport: http(RPC_URL),
  }) as PublicClient;
};

export const publicClient = getPublicClient(baseSepolia.id);
