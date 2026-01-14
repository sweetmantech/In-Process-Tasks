import { baseSepolia } from 'viem/chains';

const getApiEndpointUrl = (chainId?: number): string => {
  return chainId === baseSepolia.id
    ? 'https://in-process-git-test-sweetmantechs-projects.vercel.app'
    : 'https://inprocess.world';
};

export default getApiEndpointUrl;
