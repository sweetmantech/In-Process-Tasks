import { logger } from '@trigger.dev/sdk';
import { TurboFactory } from '@ardrive/turbo-sdk';

const uploadToArweave = async (file: File): Promise<string> => {
  try {
    const ARWEAVE_KEY = JSON.parse(
      Buffer.from(process.env.ARWEAVE_KEY as string, 'base64').toString()
    );

    logger.log('Starting upload', {
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
      fileName: file.name,
      fileType: file.type,
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const turboClient = TurboFactory.authenticated({ privateKey: ARWEAVE_KEY });

    const tags = [
      { name: 'Content-Type', value: file.type },
      { name: 'App-Name', value: 'In-Process-Tasks' },
      { name: 'App-Version', value: '1.0.0' },
    ];

    if (file.name) {
      tags.push({ name: 'File-Name', value: file.name });
    }

    const { id } = await turboClient.uploadFile({
      fileStreamFactory: () => buffer,
      fileSizeFactory: () => buffer.length,
      dataItemOpts: { tags },
    });

    logger.log('Upload complete', { transactionId: id });
    return `ar://${id}`;
  } catch (error: any) {
    logger.error('Error uploading to Arweave', {
      error: error?.message ?? 'Unknown error',
    });
    throw new Error(`Error uploading to Arweave: ${error.message}`);
  }
};

export default uploadToArweave;
