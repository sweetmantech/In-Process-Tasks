import { logger, schemaTask } from '@trigger.dev/sdk/v3';
import {
  processMessageMomentSchema,
  type ProcessMessageMomentPayload,
} from '../schemas/processMessageMomentSchema';
import processMessageMoment from '../message/processMessageMoment';

export const processMessageMomentTask = schemaTask({
  id: 'process-message-moment',
  schema: processMessageMomentSchema,
  run: async (payload: ProcessMessageMomentPayload) => {
    try {
      logger.log('Processing message moment', {
        messageId: payload.messageId,
      });

      await processMessageMoment(payload.messageId);

      return { success: true, messageId: payload.messageId };
    } catch (error: any) {
      logger.error('Error processing message moment', {
        error: error?.message ?? 'Unknown error',
        messageId: payload.messageId,
      });
      throw error;
    }
  },
});
