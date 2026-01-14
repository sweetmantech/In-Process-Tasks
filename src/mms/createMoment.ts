import uploadMetadata from './uploadMetadata';
import { ProcessMmsInput } from '../schemas/processMmsSchema';
import { sendSms } from './sendSms';
import { baseSepolia } from 'viem/chains';
import getApiEndpointUrl from './getApiEndpointUrl';
import getMmsMomentParameter from './getMmsMomentParameter';
import getArtistProfile from '../getArtistProfile';

const createMoment = async (payload: ProcessMmsInput) => {
  const { uri, name } = await uploadMetadata(payload);
  const momentCreateParameters = getMmsMomentParameter(
    name,
    uri,
    payload.chainId,
    payload.artistAddress
  );
  const apiBaseUrl = getApiEndpointUrl(payload.chainId);
  const response = await fetch(`${apiBaseUrl}/api/moment/create`, {
    method: 'POST',
    body: JSON.stringify(momentCreateParameters),
  });
  if (!response.ok) {
    throw new Error('Failed to create moment');
  }
  const data = await response.json();
  const baseUrl = getApiEndpointUrl(payload.chainId);
  const chainPrefix = payload?.chainId === baseSepolia.id ? 'bsep' : 'base';
  const profile = await getArtistProfile(payload.artistAddress);
  await sendSms(
    profile.phone.phone_number as string,
    `Moment created!: ${baseUrl}/collect/${chainPrefix}:${data.contractAddress}/${data.tokenId}`
  );
};

export default createMoment;
