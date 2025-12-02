import { z } from 'zod';
import { base } from 'viem/chains';
/**
 * Schema for validating MUX to Arweave migration requests.
 */
export const migrateMuxSchema = z.object({
  collectionAddress: z.string().min(1),
  tokenId: z.string().min(1),
  chainId: z.number().optional().default(base.id),
});

export type MigrateMuxInput = z.infer<typeof migrateMuxSchema>;
