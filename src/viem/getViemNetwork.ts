import { baseSepolia, base } from 'viem/chains';

const getViemNetwork = (chainId: number) => {
  switch (chainId) {
    case base.id:
      return base;
    case baseSepolia.id:
      return baseSepolia;
    default:
      return base;
  }
};

export default getViemNetwork;
