import { TurboFactory } from '@ardrive/turbo-sdk/node';

const ARWEAVE_KEY = JSON.parse(
  Buffer.from(process.env.ARWEAVE_KEY as string, 'base64').toString()
);

const turboClient = TurboFactory.authenticated({ privateKey: ARWEAVE_KEY });

export default turboClient;
