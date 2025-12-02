import { z } from 'zod';
import { base } from 'viem/chains';
import addressSchema from './addressSchema';
/**
 * Schema for validating MUX to Arweave migration requests.
 */
export const migrateMuxSchema = z.object({
  collectionAddress: addressSchema,
  tokenIds: z.array(z.string()),
  chainId: z.number().optional().default(base.id),
});

export type MigrateMuxInput = z.infer<typeof migrateMuxSchema>;
