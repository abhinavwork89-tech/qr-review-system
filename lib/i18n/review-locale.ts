export type SupportedReviewLocale = "en" | "hi";

/** localStorage key for manual language override on public review pages */
export const REVIEW_LOCALE_STORAGE_KEY = "review_locale_v1";

/** User override from localStorage, or `fallback` when unset / invalid. */
export function readStoredReviewLocale(
  fallback: SupportedReviewLocale,
): SupportedReviewLocale {
  if (typeof window === "undefined") return fallback;
  try {
    const storedRaw = localStorage.getItem(REVIEW_LOCALE_STORAGE_KEY);
    if (!storedRaw) return fallback;
    const s = storedRaw.trim().toLowerCase();
    if (s === "en" || s === "hi" || s === "hindi") {
      return normalizeReviewLocale(storedRaw);
    }
  } catch {
    /* ignore storage */
  }
  return fallback;
}

export function normalizeReviewLocale(raw: string | null | undefined): SupportedReviewLocale {
  if (raw === null || raw === undefined) return "en";
  const t = String(raw).trim().toLowerCase();
  if (t === "hi" || t === "hindi" || t.startsWith("hi-")) return "hi";
  return "en";
}
