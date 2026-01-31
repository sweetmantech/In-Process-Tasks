import { z } from 'zod';

export const processMessageMomentSchema = z.object({
  messageId: z.string(),
});

export type ProcessMessageMomentPayload = z.infer<
  typeof processMessageMomentSchema
>;
