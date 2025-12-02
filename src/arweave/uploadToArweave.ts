import { logger } from '@trigger.dev/sdk';
import Arweave from 'arweave';

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
  timeout: 60000,
  logging: false,
});

const uploadToArweave = async (
  file: File,
  getProgress: (progress: number) => void = () => {}
): Promise<string> => {
  try {
    const ARWEAVE_KEY = JSON.parse(
      Buffer.from(process.env.ARWEAVE_KEY as string, 'base64').toString()
    );
    const buffer = await file.arrayBuffer();

    const transaction = await arweave.createTransaction(
      {
        data: buffer,
      },
      ARWEAVE_KEY
    );

    // Add essential tags for accessibility and CORS
    transaction.addTag('Content-Type', file.type);
    transaction.addTag('App-Name', 'In-Process-Tasks');
    transaction.addTag('App-Version', '1.0.0');

    // Add filename if available
    if (file.name) {
      transaction.addTag('File-Name', file.name);
    }

    await arweave.transactions.sign(transaction, ARWEAVE_KEY);

    logger.log('Starting upload', {
      fileSizeMB: (buffer.byteLength / (1024 * 1024)).toFixed(2),
    });

    const uploader = await arweave.transactions.getUploader(transaction);
    let lastProgress = 0;
    let retryCount = 0;
    const maxRetries = 3;

    while (!uploader.isComplete) {
      try {
        const currentProgress = uploader.pctComplete;
        if (currentProgress !== lastProgress && currentProgress % 25 === 0) {
          getProgress(currentProgress);
          lastProgress = currentProgress;
        }

        await uploader.uploadChunk();
        retryCount = 0; // Reset retry count on successful chunk
      } catch (chunkError: any) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(
            `Failed to upload chunk after ${maxRetries} retries: ${chunkError?.message || 'Unknown error'}`
          );
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    logger.log('Upload complete', {
      transactionId: transaction.id,
    });

    // Submit the transaction to ensure it's broadcast to the network
    // This helps with cross-origin accessibility
    try {
      await arweave.transactions.post(transaction);
    } catch (submitError: any) {
      // Log but don't fail - the transaction might already be in the network
      logger.warn('Transaction submission warning', {
        error: submitError?.message,
      });
    }

    return `ar://${transaction.id}`;
  } catch (error: any) {
    logger.error('Error uploading to Arweave', {
      error: error?.message ?? 'Unknown error',
    });
    throw new Error(`Error uploading to Arweave: ${error.message}`);
  }
};

export default uploadToArweave;
