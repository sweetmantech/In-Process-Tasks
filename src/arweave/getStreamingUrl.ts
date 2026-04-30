const INPROCESS_MEDIA_STREAM_BASE =
  'https://api.inprocess.world/api/media/stream';

/** `GET /api/media/stream?url=ar://…` — resolves `ar://` via InProcess for playback probes. */
export function getStreamingUrl(arweaveUri: string): string {
  const u = new URL(INPROCESS_MEDIA_STREAM_BASE);
  u.searchParams.set('url', arweaveUri);
  return u.toString();
}
