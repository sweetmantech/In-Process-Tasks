import { Address, encodeFunctionData } from 'viem';
import { zoraCreator1155ImplABI } from '@zoralabs/protocol-deployments';

const getUpdateContractMetadataCall = (
  collectionAddress: Address,
  newMetadataUri: string,
  contractName: string
) => {
  return {
    to: collectionAddress,
    data: encodeFunctionData({
      abi: zoraCreator1155ImplABI,
      functionName: 'updateContractMetadata',
      args: [newMetadataUri, contractName],
    }),
  };
};

export default getUpdateContractMetadataCall;
