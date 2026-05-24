import { sanitizeReviewSuggestion } from "@/lib/ai/review-gen-sanitize";

/**
 * Ensures exactly `expected` sanitized suggestions, padding from `fallbackPool` when needed.
 * Never returns fewer than expected when the pool has at least one entry.
 */
export function ensureReviewSuggestionCount(
  partial: string[],
  expected: number,
  fallbackPool: string[],
): string[] {
  const safeExpected = Math.min(5, Math.max(1, Math.floor(expected)));
  const pool =
    fallbackPool.length > 0
      ? fallbackPool
      : [
          "Average experience — acceptable basics overall, neutral tone, and nothing that strongly pulls me back yet today.",
        ];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of partial) {
    const s = sanitizeReviewSuggestion(item);
    if (s && !seen.has(s)) {
      out.push(s);
      seen.add(s);
    }
    if (out.length >= safeExpected) return out.slice(0, safeExpected);
  }

  let fi = 0;
  while (out.length < safeExpected && fi < pool.length * 4) {
    const candidate = pool[fi % pool.length]!;
    const s = sanitizeReviewSuggestion(candidate) ?? candidate.slice(0, 220).trim();
    if (s.length >= 80 && !seen.has(s)) {
      out.push(s);
      seen.add(s);
    }
    fi++;
  }

  while (out.length < safeExpected) {
    const candidate = pool[out.length % pool.length]!;
    out.push(sanitizeReviewSuggestion(candidate) ?? candidate.slice(0, 220).trim());
  }

  return out.slice(0, safeExpected);
}
