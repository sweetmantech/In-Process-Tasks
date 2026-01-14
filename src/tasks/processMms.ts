import { logger, schemaTask } from '@trigger.dev/sdk/v3';
import {
  processMmsSchema,
  type ProcessMmsInput,
} from '../schemas/processMmsSchema';
import createMoment from '../mms/createMoment';

export const migrateMuxToArweaveTask = schemaTask({
  id: 'process-mms-task',
  schema: processMmsSchema,
  // Use large-2x machine (8 vCPU, 16GB RAM) for video processing
  // This matches the config default but makes it explicit
  machine: 'large-2x',
  // Retry configuration for OOM errors
  retry: {
    outOfMemory: {
      machine: 'large-2x', // Already at max, but ensures retry behavior
    },
  },
  run: async (payload: ProcessMmsInput) => {
    try {
      const result = await createMoment(payload);
      //   logger.log('Migration completed', {
      //     transactionHash: result.transactionHash,
      //     tokensMigrated: result.results.length,
      //   });
      //   return result;
    } catch (error: any) {
      logger.error('Error migrating MUX to Arweave', {
        error: error?.message ?? 'Unknown error',
      });
    }
  },
});
