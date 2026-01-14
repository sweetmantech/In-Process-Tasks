import { logger, schemaTask } from '@trigger.dev/sdk/v3';
import {
  migrateMuxSchema,
  type MigrateMuxInput,
} from '../schemas/migrateMuxSchema';
import { migrateMuxToArweave } from './migrateMuxToArweave';
import addressSchema from '../schemas/addressSchema';

type TaskPayload = MigrateMuxInput & {
  artistAddress: string;
};

export const migrateMuxToArweaveTask = schemaTask({
  id: 'migrate-mux-to-arweave',
  schema: migrateMuxSchema.extend({
    artistAddress: addressSchema,
  }),
  // Use large-2x machine (8 vCPU, 16GB RAM) for video processing
  // This matches the config default but makes it explicit
  machine: 'large-2x',
  // Retry configuration for OOM errors
  retry: {
    outOfMemory: {
      machine: 'large-2x', // Already at max, but ensures retry behavior
    },
  },
  run: async (payload: TaskPayload) => {
    try {
      const result = await migrateMuxToArweave({
        collectionAddress: payload.collectionAddress as `0x${string}`,
        tokenIds: payload.tokenIds,
        chainId: payload.chainId,
        artistAddress: payload.artistAddress as `0x${string}`,
      });
      logger.log('Migration completed', {
        transactionHash: result.transactionHash,
        tokensMigrated: result.results.length,
      });
      return result;
    } catch (error: any) {
      logger.error('Error migrating MUX to Arweave', {
        error: error?.message ?? 'Unknown error',
      });
    }
  },
});
