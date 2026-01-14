import { logger } from '@trigger.dev/sdk/v3';
import { Address, OneOf } from 'viem';
import { Call } from '@coinbase/coinbase-sdk/dist/types/calls';
import { baseSepolia } from 'viem/chains';
import { getOrCreateSmartWallet } from './getOrCreateSmartWallet';
import { sendUserOperation } from './sendUserOperation';
import getUpdateTokenURICall from '../viem/getUpdateTokenURICall';
import getUpdateContractMetadataCall from '../viem/getUpdateContractMetadataCall';
import { TokenMetadataJson } from '../ipfs/types';

/**
 * Updates token metadata on-chain in a single batch transaction.
 * Creates update calls for all tokens and sends them via smart wallet.
 * If tokenId is "0", calls updateContractMetadata instead of updateTokenURI.
 * For tokenId "0", uses the contract name from the provided metadata map.
 */
export async function updateTokenMetadataOnChain(
  collectionAddress: Address,
  tokenMetadataMap: Map<string, string>,
  chainId: number,
  artistAddress: Address,
  metadataMap?: Map<string, TokenMetadataJson>
): Promise<string> {
  if (tokenMetadataMap.size === 0) {
    throw new Error('No token metadata to update');
  }

  // Group tokens by metadata URI to show deduplication
  const metadataUriToTokenIds = new Map<string, string[]>();
  for (const [tokenId, metadataUri] of tokenMetadataMap.entries()) {
    if (!metadataUriToTokenIds.has(metadataUri)) {
      metadataUriToTokenIds.set(metadataUri, []);
    }
    metadataUriToTokenIds.get(metadataUri)!.push(tokenId);
  }

  logger.log('Preparing on-chain updates', {
    tokenCount: tokenMetadataMap.size,
    uniqueMetadataUris: metadataUriToTokenIds.size,
  });

  // Create update calls for all tokens
  const updateCalls: OneOf<Call<unknown, { [key: string]: unknown }>>[] = [];
  const callDetails: Array<{
    tokenId: string;
    callType: string;
    metadataUri: string;
  }> = [];

  for (const [tokenId, metadataUri] of tokenMetadataMap.entries()) {
    if (tokenId === '0') {
      // Use updateContractMetadata for token ID 0
      // Get the contract name from the metadata map
      const contractMetadata = metadataMap?.get(tokenId);
      if (!contractMetadata) {
        throw new Error(
          'Contract metadata not found in metadata map for tokenId 0'
        );
      }

      const contractName = contractMetadata.name;
      if (!contractName) {
        throw new Error('Contract metadata must have a name field');
      }

      updateCalls.push(
        getUpdateContractMetadataCall(
          collectionAddress,
          metadataUri,
          contractName
        ) as OneOf<Call<unknown, { [key: string]: unknown }>>
      );
      callDetails.push({
        tokenId,
        callType: 'updateContractMetadata',
        metadataUri,
      });
    } else {
      // Use updateTokenURI for other token IDs
      updateCalls.push(
        getUpdateTokenURICall(collectionAddress, tokenId, metadataUri) as OneOf<
          Call<unknown, { [key: string]: unknown }>
        >
      );
      callDetails.push({
        tokenId,
        callType: 'updateTokenURI',
        metadataUri,
      });
    }
  }

  logger.log('On-chain update calls prepared', {
    totalCalls: updateCalls.length,
  });

  // Get or create smart wallet
  const smartAccount = await getOrCreateSmartWallet({
    address: artistAddress,
  });

  // Send batch transaction
  const transaction = await sendUserOperation({
    smartAccount,
    network: chainId === baseSepolia.id ? 'base-sepolia' : 'base',
    calls: updateCalls,
  });

  logger.log('Token metadata updated on-chain', {
    transactionHash: transaction.transactionHash,
    tokensUpdated: tokenMetadataMap.size,
  });

  return transaction.transactionHash;
}
