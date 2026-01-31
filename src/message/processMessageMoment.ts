import { logger } from '@trigger.dev/sdk';
import indexMessageMoment from './indexMessageMoment';

const processMessageMoment = async (messageId: string) => {
  const FATAL_ERRORS = [
    'Message not found',
    'Message is not a moment message',
    'Failed to index message',
  ];
  while (true) {
    const result = await indexMessageMoment(messageId);

    if (result.success && result.messageMoment) {
      logger.log('Message moment indexed successfully', {
        messageId,
        messageMoment: result.messageMoment,
      });
      return result.messageMoment;
    }

    if (result.error) {
      if (FATAL_ERRORS.includes(result.error)) {
        logger.error('Fatal error processing message moment', {
          error: result.error,
          messageId,
        });
        throw new Error(result.error);
      }

      // "Moment not found" - continue polling
      logger.log('Moment is not indexed yet, retrying...', { messageId });
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
};

export default processMessageMoment;
