import { z } from 'zod';

export const processMessageMomentSchema = z.object({
  messageId: z.string().uuid(),
});

export type ProcessMessageMomentPayload = z.infer<
  typeof processMessageMomentSchema
>;
