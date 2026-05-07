import { Readable } from 'stream';
import turboClient from './turboClient';
import patchFetch from './patchFetch';
import { logger, retry } from '@trigger.dev/sdk/v3';

export type ArweaveUploadResult = {
  arweave_uri: string;
  winc_cost: string;
};

const uploadRetryOptions = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 2_000,
  maxTimeoutInMs: 60_000,
  randomize: true,
} as const;

export const uploadToArweave = async (
  file: File
): Promise<ArweaveUploadResult> => {
  const uint8Array = new Uint8Array(await file.arrayBuffer());
  const restoreFetch = patchFetch();

  logger.log('Starting upload', {
    fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
    fileName: file.name,
    fileType: file.type,
  });

  try {
    return await retry.onThrow(async ({ attempt, maxAttempts }) => {
      if (attempt > 1) {
        logger.log('Retrying Arweave upload', {
          attempt,
          maxAttempts,
          fileName: file.name,
        });
      }

      const { id, winc } = await turboClient.uploadFile({
        fileStreamFactory: () => Readable.from(Buffer.from(uint8Array)),
        fileSizeFactory: () => file.size,
        dataItemOpts: {
          tags: [
            { name: 'Content-Type', value: file.type },
            { name: 'File-Name', value: file.name },
          ],
        },
        chunkingMode: 'disabled',
      });

      if (!id) {
        throw new Error(
          'Failed to upload file to Arweave (missing id in response)'
        );
      }
      const arweaveURI = `ar://${id}`;
      logger.log('Upload complete', { arweaveURI });
      return { arweave_uri: arweaveURI, winc_cost: winc };
    }, uploadRetryOptions);
  } finally {
    restoreFetch();
  }
};

export default uploadToArweave;
