import { retry } from '@trigger.dev/sdk/v3';

/** First N bytes (inclusive last index = length - 1). ~8 KiB: cheap but exercises a bit more than a single byte. */
const PROBE_PREFIX_LENGTH = 8192;

/**
 * True if GET with Range for an initial prefix returns 200 or 206.
 * Still a heuristic (not full-file proof); stronger than a 1-byte probe for “stream starts here”.
 */
export async function probeReadableWithRangePrefix(
  url: string
): Promise<boolean> {
  const last = PROBE_PREFIX_LENGTH - 1;
  try {
    const res = await retry.fetch(url, {
      method: 'GET',
      headers: { Range: `bytes=0-${last}` },
      timeoutInMs: 30_000,
      retry: {
        timeout: {
          maxAttempts: 3,
          factor: 1.5,
          minTimeoutInMs: 500,
          maxTimeoutInMs: 5_000,
          randomize: true,
        },
        connectionError: {
          maxAttempts: 3,
          factor: 1.5,
          minTimeoutInMs: 500,
          maxTimeoutInMs: 5_000,
          randomize: true,
        },
        byStatus: {
          '500-599': {
            strategy: 'backoff',
            maxAttempts: 3,
            factor: 2,
            minTimeoutInMs: 1_000,
            maxTimeoutInMs: 8_000,
            randomize: false,
          },
        },
      },
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}
