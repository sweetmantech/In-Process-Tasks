import { logger, schemaTask } from '@trigger.dev/sdk/v3';
import {
  migrateMuxSchema,
  type MigrateMuxInput,
} from '../schemas/migrateMuxSchema';
import { migrateMuxToArweave } from '../moment/migrateMuxToArweave';
import addressSchema from '../schemas/addressSchema';

type TaskPayload = MigrateMuxInput & {
  artistAddress: string;
};

export const migrateMuxToArweaveTask = schemaTask({
  id: 'migrate-mux-to-arweave',
  schema: migrateMuxSchema.extend({
    artistAddress: addressSchema,
  }),
  machine: 'micro',
  retry: {
    outOfMemory: {
      machine: 'medium-2x',
    },
  },
  run: async (payload: TaskPayload) => {
    try {
      const result = await migrateMuxToArweave({
        collectionAddress: payload.collectionAddress as `0x${string}`,
        tokenId: payload.tokenId,
        chainId: payload.chainId,
        artistAddress: payload.artistAddress as `0x${string}`,
      });
      logger.log('Migration completed', {
        transactionHash: result.transactionHash,
      });
      return result;
    } catch (error: any) {
      logger.error('Error migrating MUX to Arweave', {
        error: error?.message ?? 'Unknown error',
      });
    }
  },
});
