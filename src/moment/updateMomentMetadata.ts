import { logger } from '@trigger.dev/sdk/v3';
import { Address, OneOf } from 'viem';
import { Call } from '@coinbase/coinbase-sdk/dist/types/calls';
import { baseSepolia } from 'viem/chains';
import { getOrCreateSmartWallet } from '../coinbase/getOrCreateSmartWallet';
import { sendUserOperation } from '../coinbase/sendUserOperation';
import getUpdateTokenURICall from '../viem/getUpdateTokenURICall';
import getUpdateContractMetadataCall from '../viem/getUpdateContractMetadataCall';
import { TokenMetadataJson } from '../ipfs/types';

/**
 * Updates a single token's metadata on-chain via smart wallet.
 * Uses updateContractMetadata for tokenId "0", updateTokenURI for all others.
 */
export async function updateMomentMetadata(
  collectionAddress: Address,
  tokenId: string,
  metadataUri: string,
  chainId: number,
  artistAddress: Address,
  metadata: TokenMetadataJson
): Promise<string> {
  let call: OneOf<Call<unknown, { [key: string]: unknown }>>;

  if (tokenId === '0') {
    if (!metadata.name)
      throw new Error('Contract metadata must have a name field');
    call = getUpdateContractMetadataCall(
      collectionAddress,
      metadataUri,
      metadata.name
    ) as OneOf<Call<unknown, { [key: string]: unknown }>>;
  } else {
    call = getUpdateTokenURICall(
      collectionAddress,
      tokenId,
      metadataUri
    ) as OneOf<Call<unknown, { [key: string]: unknown }>>;
  }

  const smartAccount = await getOrCreateSmartWallet({ address: artistAddress });

  const transaction = await sendUserOperation({
    smartAccount,
    network: chainId === baseSepolia.id ? 'base-sepolia' : 'base',
    calls: [call],
  });

  logger.log('Token metadata updated on-chain', {
    transactionHash: transaction.transactionHash,
    tokenId,
  });

  return transaction.transactionHash;
}
