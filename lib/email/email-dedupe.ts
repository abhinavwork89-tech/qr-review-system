/** Short window to suppress duplicate sends from retries or double-submits (same warm instance). */
const TTL_MS = 10 * 60 * 1000;
const successes = new Map<string, number>();

function prune() {
  const now = Date.now();
  for (const [k, t] of successes) {
    if (now - t > TTL_MS) successes.delete(k);
  }
}

export function shouldSuppressDuplicateEmail(dedupeKey: string): boolean {
  prune();
  return successes.has(dedupeKey);
}

export function markEmailSendSucceeded(dedupeKey: string) {
  successes.set(dedupeKey, Date.now());
}
