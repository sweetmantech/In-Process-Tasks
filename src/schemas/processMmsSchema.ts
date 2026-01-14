import { z } from 'zod';
import { base } from 'viem/chains';
import addressSchema from './addressSchema';

export const processMmsSchema = z.object({
  artistAddress: addressSchema,
  chainId: z.number().optional().default(base.id),
  media: z.string().url(),
  subject: z.string().optional(),
  text: z.string().optional(),
});

// Infer the type from the schema to get the correct branded address type
export type ProcessMmsInput = z.infer<typeof processMmsSchema>;
