import { base, baseSepolia } from 'viem/chains';

const getUsdcAddress = (chainId?: number) => {
  switch (chainId) {
    case baseSepolia.id:
      return '0x14196F08a4Fa0B66B7331bC40dd6bCd8A1dEeA9F';
    case base.id:
      return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    default:
      return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  }
};

export default getUsdcAddress;
