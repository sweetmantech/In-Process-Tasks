import { Hash, OneOf } from 'viem';
import cdp from './client';
import { Call } from '@coinbase/coinbase-sdk/dist/types/calls';
import { getPublicClient } from '../viem/getPublicClient';

type EvmUserOperationNetwork = 'base-sepolia' | 'base';

export interface SendUserOperationParams {
  smartAccount: any;
  calls: readonly OneOf<Call<unknown, { [key: string]: unknown }>>[];
  network: EvmUserOperationNetwork;
}

export async function sendUserOperation({
  smartAccount,
  calls,
  network,
}: SendUserOperationParams) {
  // Send the transaction
  const sendResult = await cdp.evm.sendUserOperation({
    smartAccount,
    network,
    paymasterUrl: `https://api.developer.coinbase.com/rpc/v1/${network}/${process.env.CDP_PAYMASTER_KEY}`,
    calls,
  });

  // Wait for the transaction to be mined
  await cdp.evm.waitForUserOperation({
    smartAccountAddress: smartAccount.address,
    userOpHash: sendResult.userOpHash,
  });

  // Get the user operation
  const userOp = await cdp.evm.getUserOperation({
    smartAccount,
    userOpHash: sendResult.userOpHash,
  });

  // Wait for the transaction receipt
  const publicClient = getPublicClient(
    network === 'base-sepolia' ? 84532 : 8453
  );
  const transaction = await publicClient.waitForTransactionReceipt({
    hash: userOp.transactionHash as Hash,
  });

  return transaction;
}
