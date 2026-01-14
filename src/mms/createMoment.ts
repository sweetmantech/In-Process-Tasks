import uploadMetadata from './uploadMetadata';
import { parseUnits, maxUint64 } from 'viem';
import getUsdcAddress from '../getUsdcAddress';
import { ProcessMmsInput } from '../schemas/processMmsSchema';

const createMoment = async (payload: ProcessMmsInput) => {
  const media = payload.media?.[0];
  if (!media) {
    throw new Error('Media is required');
  }
  const { uri, name } = await uploadMetadata(media, payload);
  const momentCreateParameters = {
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
        saleStart: BigInt(Number(new Date().getTime() / 1000).toFixed(0)),
        saleEnd: maxUint64,
        currency: getUsdcAddress(payload.chainId),
      },
      mintToCreatorCount: 1,
      payoutRecipient: payload.artistAddress,
    },
    account: payload.artistAddress,
  };
};

export default createMoment;
