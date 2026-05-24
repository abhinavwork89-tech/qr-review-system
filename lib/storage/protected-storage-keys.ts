import { ADMIN_SESSION_LOCALSTORAGE_KEY } from "@/lib/admin-auth";
import { REVIEW_LOCALE_STORAGE_KEY } from "@/lib/i18n/review-locale";

/** Keys that must never be removed by public review/reward cleanup. */
export const PROTECTED_STORAGE_EXACT_KEYS = new Set<string>([
  ADMIN_SESSION_LOCALSTORAGE_KEY,
  "admin:sidebar:collapsed",
  "admin-theme",
  REVIEW_LOCALE_STORAGE_KEY,
]);

/** Key prefixes reserved for admin, auth providers, and framework session state. */
export const PROTECTED_STORAGE_PREFIXES = [
  "admin:",
  "sb-",
  "supabase",
  "auth",
  "next-auth",
] as const;

export function isProtectedStorageKey(key: string): boolean {
  if (!key) return true;
  if (PROTECTED_STORAGE_EXACT_KEYS.has(key)) return true;
  return PROTECTED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}
