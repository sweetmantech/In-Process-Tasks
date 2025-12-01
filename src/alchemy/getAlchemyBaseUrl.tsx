import { base, baseSepolia } from 'viem/chains';

const BASE = 'https://base-mainnet.g.alchemy.com/';
const BASE_SEPOLIA = 'https://base-sepolia.g.alchemy.com/';

const getAlchemyBaseUrl = (chainId: number) => {
  switch (chainId) {
    case baseSepolia.id:
      return BASE_SEPOLIA;
    case base.id:
      return BASE;
    default:
      return BASE;
  }
};

export default getAlchemyBaseUrl;
