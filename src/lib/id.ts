/**
 * Stable, collision-resistant id generation. Uses `crypto.randomUUID` where
 * available (all modern browsers + secure contexts) with a small fallback.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random. Good enough for a single-device local store.
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}
