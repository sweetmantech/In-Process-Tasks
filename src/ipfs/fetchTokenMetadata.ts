import { getFetchableUrl } from './gateway';
import { TokenMetadataJson } from './types';

export async function fetchTokenMetadata(tokenMetadataURI: string) {
  const fetchableUrl = getFetchableUrl(tokenMetadataURI);

  if (!fetchableUrl) {
    throw new Error(`Invalid token metadata URI: ${tokenMetadataURI}`);
  }

  const json = (await (await fetch(fetchableUrl)).json()) as
    | TokenMetadataJson
    | undefined;

  if (!json) {
    throw new Error(`Failed to fetch metadata from ${fetchableUrl}`);
  }

  return json;
}
