import { logger, schemaTask } from '@trigger.dev/sdk/v3';
import {
  migrateMuxSchema,
  type MigrateMuxInput,
} from '../schemas/migrateMuxSchema';
import { migrateMuxToArweave } from '../mux/migrateMuxToArweave';
import addressSchema from '../schemas/addressSchema';

type TaskPayload = MigrateMuxInput & {
  artistAddress: string;
};

export const migrateMuxToArweaveTask = schemaTask({
  id: 'migrate-mux-to-arweave',
  schema: migrateMuxSchema.extend({
    artistAddress: addressSchema,
  }),
  run: async (payload: TaskPayload) => {
    try {
      logger.log('Starting MUX to Arweave migration', {
        collectionAddress: payload.collectionAddress,
        tokenId: payload.tokenId,
        artistAddress: payload.artistAddress,
      });

      const result = await migrateMuxToArweave({
        collectionAddress: payload.collectionAddress as `0x${string}`,
        tokenId: payload.tokenId,
        chainId: payload.chainId,
        artistAddress: payload.artistAddress as `0x${string}`,
      });

      logger.log('Migration completed', { result });
      return result;
    } catch (error: any) {
      logger.error('Error migrating MUX to Arweave', {
        error: error?.message ?? 'Unknown error',
        collectionAddress: payload.collectionAddress,
        tokenId: payload.tokenId,
        artistAddress: payload.artistAddress,
      });
    }
  },
});
