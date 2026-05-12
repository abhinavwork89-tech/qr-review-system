export type SupportedReviewLocale = "en" | "hi";

/** localStorage key for manual language override on public review pages */
export const REVIEW_LOCALE_STORAGE_KEY = "review_locale_v1";

export function normalizeReviewLocale(raw: string | null | undefined): SupportedReviewLocale {
  if (raw === null || raw === undefined) return "en";
  const t = String(raw).trim().toLowerCase();
  if (t === "hi" || t === "hindi" || t.startsWith("hi-")) return "hi";
  return "en";
}
