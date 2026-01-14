import { parseUnits, maxUint64 } from 'viem';
import getUsdcAddress from '../getUsdcAddress';

const getMmsMomentParameter = (
  name: string,
  uri: string,
  chainId: number,
  artistAddress: string
) => {
  return {
    contract: {
      name,
      uri,
    },
    token: {
      tokenMetadataURI: uri,
      createReferral: '0x749B7b7A6944d72266Be9500FC8C221B6A7554Ce',
      salesConfig: {
        type: 'erc20Mint',
        pricePerToken: parseUnits('1', 6).toString(),
        saleStart: BigInt(
          Number(new Date().getTime() / 1000).toFixed(0)
        ).toString(),
        saleEnd: maxUint64.toString(),
        currency: getUsdcAddress(chainId),
      },
      mintToCreatorCount: 1,
      payoutRecipient: artistAddress,
    },
    account: artistAddress,
  };
};

export default getMmsMomentParameter;
