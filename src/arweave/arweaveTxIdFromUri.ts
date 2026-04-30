/** ar://${transactionId} */
export function arweaveTxIdFromUri(arweaveUri: string): string {
  if (!arweaveUri.startsWith('ar://')) {
    throw new Error(`Expected ar:// URI, got: ${arweaveUri}`);
  }
  const id = arweaveUri.slice('ar://'.length);
  if (!id) throw new Error('Empty Arweave transaction id');
  return id;
}
