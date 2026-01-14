import type { InboundMessagePayload } from 'telnyx/resources/shared';
import { z } from 'zod';
import { base } from 'viem/chains';
import addressSchema from './addressSchema';

export const processMmsSchema = z
  .custom<InboundMessagePayload>((data) => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    return true;
  })
  .and(
    z.object({
      artistAddress: addressSchema,
      chainId: z.number().optional().default(base.id),
    })
  );

// Infer the type from the schema to get the correct branded address type
export type ProcessMmsInput = z.infer<typeof processMmsSchema>;
