import { MessageSendResponse } from 'telnyx/resources/messages/messages.mjs';
import client from '../telnyx/client';

export async function sendSms(
  phoneNumber: string,
  message: string
): Promise<MessageSendResponse> {
  try {
    const TELNYX_MESSAGING_PROFILE_ID = '40019b4c-b5af-4052-966b-3f7546c2e7c0';

    const response = await client.messages.send({
      to: phoneNumber,
      text: message,
      type: 'SMS' as const,
      messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID,
    });

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
