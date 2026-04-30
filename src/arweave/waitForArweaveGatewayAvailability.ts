import { logger, retry, wait } from '@trigger.dev/sdk/v3';
import { getStreamingUrl } from './getStreamingUrl';
import {
  probeReadableWithRangePrefix,
  PROBE_PREFIX_BYTES_DEFAULT,
} from './probeReadableWithRangePrefix';

/**
 * Blocks until `api.inprocess.world/api/media/stream?url=ar://…` can serve the asset (Range probe).
 * If all sweeps fail, returns without throwing (migration continues at caller’s risk).
 * Other errors from the probe path still propagate.
 */
export async function waitForArweaveGatewayAvailability(
  arweaveUri: string,
  options?: {
    /** Default 10 minutes of polling per sweep */
    maxWaitMs?: number;
    /** Default 10 seconds between probe attempts within a sweep */
    pollIntervalSeconds?: number;
    /** After a sweep exhausts without a hit, wait this long before starting the next sweep. Default 3 minutes. */
    cooldownAfterSweepSeconds?: number;
    /** How many full polling sweeps to run (each sweep uses maxWaitMs + poll interval logic). Default 3. */
    maxSweeps?: number;
    /** Range probe byte length. Pass `PROBE_PREFIX_BYTES_VIDEO` for video; omit for small metadata JSON (8 KiB). */
    probePrefixBytes?: number;
  }
): Promise<void> {
  const maxWaitMs = options?.maxWaitMs ?? 10 * 60_000;
  const pollIntervalSeconds = options?.pollIntervalSeconds ?? 10;
  const pollIntervalMs = pollIntervalSeconds * 1000;
  const cooldownAfterSweepSeconds = options?.cooldownAfterSweepSeconds ?? 180;
  const maxSweeps = options?.maxSweeps ?? 3;
  const probePrefixBytes =
    options?.probePrefixBytes ?? PROBE_PREFIX_BYTES_DEFAULT;

  const probeUrl = getStreamingUrl(arweaveUri);
  const globalStarted = Date.now();
  const maxAttempts = Math.max(1, Math.ceil(maxWaitMs / pollIntervalMs) + 1);

  const retryOptions = {
    maxAttempts,
    factor: 1,
    minTimeoutInMs: pollIntervalMs,
    maxTimeoutInMs: pollIntervalMs,
    randomize: false,
  } as const;

  for (let sweep = 1; sweep <= maxSweeps; sweep++) {
    try {
      await retry.onThrow(async ({ attempt, maxAttempts: attemptCap }) => {
        const hit = await probeReadableWithRangePrefix(
          probeUrl,
          probePrefixBytes
        );

        if (hit) {
          logger.log('Arweave asset reachable via InProcess media stream', {
            arweaveUri,
            attempt,
            sweep,
            elapsedMs: Date.now() - globalStarted,
          });
          return;
        }

        logger.log('Waiting for Arweave via InProcess media stream', {
          arweaveUri,
          attempt,
          maxAttempts: attemptCap,
          sweep,
          elapsedMs: Date.now() - globalStarted,
        });

        throw new Error();
      }, retryOptions);

      return;
    } catch {
      if (sweep >= maxSweeps) {
        return;
      }

      logger.log(
        'Media stream probe sweep finished without success; cooldown before next sweep',
        {
          arweaveUri,
          sweep,
          nextSweep: sweep + 1,
          cooldownAfterSweepSeconds,
          elapsedMs: Date.now() - globalStarted,
        }
      );

      await wait.for({ seconds: cooldownAfterSweepSeconds });
    }
  }
}
