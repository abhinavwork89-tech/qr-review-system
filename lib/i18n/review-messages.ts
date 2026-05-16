import type { SupportedReviewLocale } from "@/lib/i18n/review-locale";
import en from "@/messages/review/en.json";
import hi from "@/messages/review/hi.json";

type MessageTree = Record<string, unknown>;

const CATALOG: Record<SupportedReviewLocale, MessageTree> = {
  en: en as MessageTree,
  hi: hi as MessageTree,
};

function getPath(tree: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, tree);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * Resolve a dotted message path for a locale, falling back to English, then the path string.
 */
export function translateReview(
  locale: SupportedReviewLocale,
  path: string,
  vars?: Record<string, string | number>,
): string {
  const primary = getPath(CATALOG[locale], path);
  if (typeof primary === "string" && primary.length > 0) {
    return interpolate(primary, vars);
  }
  const fallback = getPath(CATALOG.en, path);
  if (typeof fallback === "string" && fallback.length > 0) {
    return interpolate(fallback, vars);
  }
  return path;
}

export function getReviewSuggestionTexts(
  locale: SupportedReviewLocale,
  rating: number,
): string[] {
  const bucket = rating >= 5 ? "5" : rating >= 3 ? "3" : "1";
  const path = `review.suggestions.${bucket}`;
  let arr = getPath(CATALOG[locale], path);
  if (!Array.isArray(arr) || arr.length === 0) {
    arr = getPath(CATALOG.en, path);
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x));
}

export function mapMobileValidationToReviewKey(message: string): string | null {
  const table: Record<string, string> = {
    "This field is required": "validation.mobile.required",
    "Country code is required": "validation.mobile.countryRequired",
    "Use digits only": "validation.mobile.digitsOnly",
    "Enter a valid mobile number": "validation.mobile.invalidLength",
  };
  return table[message] ?? null;
}
