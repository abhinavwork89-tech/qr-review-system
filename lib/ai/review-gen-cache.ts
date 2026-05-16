/**
 * Short-lived in-process cache (keyed by business type + rating + language + count).
 * Reduces duplicate OpenAI spend across warm instances; not shared across serverless isolates.
 */
type Entry = { suggestions: string[]; expiresAt: number };

const store = new Map<string, Entry>();
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function reviewGenCacheKey(parts: {
  businessType: string;
  rating: number;
  language: string;
  suggestionsCount: number;
}): string {
  const t = parts.businessType.trim().toLowerCase().slice(0, 80) || "unknown";
  const lang = parts.language.trim().toLowerCase();
  return `${t}|${parts.rating}|${lang}|${parts.suggestionsCount}`;
}

export function getReviewGenCache(key: string): string[] | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return null;
  }
  return e.suggestions;
}

export function setReviewGenCache(
  key: string,
  suggestions: string[],
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  store.set(key, { suggestions, expiresAt: Date.now() + ttlMs });
}
