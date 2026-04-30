import { logger, retry } from '@trigger.dev/sdk/v3';

/**
 * Seeds CDN / edge caches with the initial-byte Range response for `streamUrl`.
 * Unlike {@link probeReadableWithRangePrefix}, skips no-store so the response may be cached.
 *
 * Touches only the cache key for `Range: bytes=0-(prefix-1)` — not the full asset
 * and not arbitrary seek ranges.
 */
export async function seedMediaStreamCacheRangePrefix(
  streamUrl: string,
  prefixLengthBytes: number
): Promise<void> {
  const n = Math.max(1, Math.floor(prefixLengthBytes));
  const last = n - 1;
  const timeoutInMs = n >= 1024 * 1024 ? 120_000 : 30_000;

  try {
    const res = await retry.fetch(streamUrl, {
      method: 'GET',
      headers: {
        Range: `bytes=0-${last}`,
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

    if (!res.ok && res.status !== 206) {
      return;
    }

    await res.arrayBuffer();
  } catch (e) {
    logger.log('Media stream cache seed (range prefix) failed (non-fatal)', {
      streamUrl,
      prefixLengthBytes,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
