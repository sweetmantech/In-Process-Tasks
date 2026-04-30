/**
 * When a `fetch` response is not fully read, Undici can keep the socket busy;
 * the next request may see errors or bogus status if the pool reuses it.
 */
export async function discardResponseBody(res: Response): Promise<void> {
  if (!res.body) return;
  try {
    await res.body.cancel();
  } catch {
    // ignore
  }
}
