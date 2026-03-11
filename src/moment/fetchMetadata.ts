import { retry } from '@trigger.dev/sdk/v3';
import { TokenMetadataJson } from '../ipfs/types';

const fetchMetadata = async (uri: string): Promise<TokenMetadataJson> => {
  const response = await retry.fetch(
    `https://api.inprocess.world/api/metadata?uri=${encodeURIComponent(uri)}`,
    {
      timeoutInMs: 30_000,
      retry: {
        timeout: {
          maxAttempts: 5,
          minTimeoutInMs: 1_000,
          maxTimeoutInMs: 30_000,
          factor: 2,
        },
        connectionError: {
          maxAttempts: 5,
          minTimeoutInMs: 1_000,
          maxTimeoutInMs: 30_000,
          factor: 2,
        },
        byStatus: {
          '400,408,429,5xx': {
            strategy: 'backoff',
            maxAttempts: 5,
            minTimeoutInMs: 1_000,
            maxTimeoutInMs: 30_000,
            factor: 2,
          },
        },
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch metadata: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return data as TokenMetadataJson;
};

export default fetchMetadata;
