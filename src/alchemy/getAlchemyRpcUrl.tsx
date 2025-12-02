import getAlchemyBaseUrl from './getAlchemyBaseUrl';

const getAlchemyRpcUrl = (chainId: number) => {
  return `${getAlchemyBaseUrl(chainId)}v2/${process.env.ALCHEMY_API_KEY}`;
};

export default getAlchemyRpcUrl;
