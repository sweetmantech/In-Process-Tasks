import { logger } from '@trigger.dev/sdk';

const indexMessageMoment = async (messageId: string) => {
  const response = await fetch(
    `https://api.inprocess.world/api/message/index-moment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    logger.error('indexMessageMoment API error', {
      messageId,
      status: response.status,
      statusText: response.statusText,
      body: text,
    });
    return { error: text };
  }

  const data = await response.json();
  return data;
};

export default indexMessageMoment;
