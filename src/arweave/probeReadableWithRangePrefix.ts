import { retry } from '@trigger.dev/sdk/v3';

/** JSON / small asset probes (metadata). */
export const PROBE_PREFIX_BYTES_DEFAULT = 8192;

/** Video stream probes — enough prefix to exercise sustained read path. */
export const PROBE_PREFIX_BYTES_VIDEO = 5 * 1024 * 1024;

/**
 * True if GET with Range for an initial prefix returns 200 or 206.
 * Uses no-store / no-cache so probes are not satisfied from a stale HTTP cache while the tx propagates.
 */
export async function probeReadableWithRangePrefix(
  url: string,
  prefixLengthBytes: number = PROBE_PREFIX_BYTES_DEFAULT
): Promise<boolean> {
  const n = Math.max(1, Math.floor(prefixLengthBytes));
  const last = n - 1;
  const timeoutInMs = n >= 1024 * 1024 ? 120_000 : 30_000;

  try {
    const res = await retry.fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Range: `bytes=0-${last}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      timeoutInMs,
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
