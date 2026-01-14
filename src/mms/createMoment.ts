import uploadMetadata from './uploadMetadata';
import { parseUnits, maxUint64 } from 'viem';
import getUsdcAddress from '../getUsdcAddress';
import { ProcessMmsInput } from '../schemas/processMmsSchema';
import { sendSms } from './sendSms';
import { baseSepolia } from 'viem/chains';

const createMoment = async (payload: ProcessMmsInput) => {
  const { uri, name } = await uploadMetadata(payload);
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
        saleStart: BigInt(
          Number(new Date().getTime() / 1000).toFixed(0)
        ).toString(),
        saleEnd: maxUint64.toString(),
        currency: getUsdcAddress(payload.chainId),
      },
      mintToCreatorCount: 1,
      payoutRecipient: payload.artistAddress,
    },
    account: payload.artistAddress,
  };
  const response = await fetch('https://inprocess.world/api/moment/create', {
    method: 'POST',
    body: JSON.stringify(momentCreateParameters),
  });
  if (!response.ok) {
    throw new Error('Failed to create moment');
  }
  const data = await response.json();
  await sendSms(
    payload?.from?.phone_number as string,
    `Moment created!: ${
      payload?.chainId === baseSepolia.id
        ? 'https://in-process-git-test-sweetmantechs-projects.vercel.app'
        : 'https://inprocess.world'
    }/collect/${payload?.chainId === baseSepolia.id ? 'bsep' : 'base'}:${data.contractAddress}/${data.tokenId}`
  );
};

export default createMoment;
