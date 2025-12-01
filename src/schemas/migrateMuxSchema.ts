import { z } from 'zod';

/**
 * Schema for validating MUX to Arweave migration requests.
 */
export const migrateMuxSchema = z.object({
  tokenContractAddress: z.string().min(1),
  tokenId: z.string().min(1),
  chainId: z.number(),
});

export type MigrateMuxInput = z.infer<typeof migrateMuxSchema>;
