import { isProtectedStorageKey } from "@/lib/storage/protected-storage-keys";

/**
 * Removes a single storage entry only when it is not admin/auth protected.
 * Never calls Storage.clear().
 */
export function safeRemoveLocalStorageItem(key: string): boolean {
  if (typeof window === "undefined" || isProtectedStorageKey(key)) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveSessionStorageItem(key: string): boolean {
  if (typeof window === "undefined" || isProtectedStorageKey(key)) return false;
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
