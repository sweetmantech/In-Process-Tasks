import { Readable } from 'stream';
import turboClient from './turboClient';
import patchFetch from './patchFetch';
import { logger } from '@trigger.dev/sdk';

export const uploadToArweave = async (file: File): Promise<string> => {
  const uint8Array = new Uint8Array(await file.arrayBuffer());
  const restoreFetch = patchFetch();

  logger.log('Starting upload', {
    fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
    fileName: file.name,
    fileType: file.type,
  });

  try {
    const { id } = await turboClient.uploadFile({
      fileStreamFactory: () => Readable.from(Buffer.from(uint8Array)),
      fileSizeFactory: () => file.size,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: file.type },
          { name: 'File-Name', value: file.name },
        ],
      },
    });

    const arweaveURI = `ar://${id}`;
    logger.log('Upload complete', { arweaveURI });
    return arweaveURI;
  } finally {
    restoreFetch();
  }
};

export default uploadToArweave;
