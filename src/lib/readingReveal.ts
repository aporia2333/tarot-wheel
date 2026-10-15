// A one-time visual cue for client navigation after confirming a draw.
// Reloads and historical readings display the already saved result immediately.
let pendingReadingId: string | null = null;

export function prepareReadingReveal(readingId: string) { pendingReadingId = readingId; }
export function consumeReadingReveal(readingId: string): boolean {
  if (pendingReadingId !== readingId) return false;
  pendingReadingId = null;
  return true;
}
