import { REVIEW_STORAGE_KEYS } from "@/lib/review/review-storage";
import {
  DELAYED_REVIEW_MODAL_PREFIX,
  rewardPendingScratchKey,
  rewardUsedStorageKey,
} from "@/lib/review/review-reward-storage-keys";
import {
  safeRemoveLocalStorageItem,
  safeRemoveSessionStorageItem,
} from "@/lib/storage/safe-client-storage";
import { isProtectedStorageKey } from "@/lib/storage/protected-storage-keys";

/** Public marketing site — end of review session redirect target. */
export const REVIEW_SESSION_EXIT_URL = "https://onecoreapp.com";

/** Explicit allowlist of review-flow localStorage keys (never use Storage.clear). */
export function reviewFlowLocalStorageKeys(): readonly string[] {
  return [
    REVIEW_STORAGE_KEYS.submitted,
    REVIEW_STORAGE_KEYS.snapshot,
    REVIEW_STORAGE_KEYS.googleConfirmed,
  ];
}

/** Reward + review session keys for one business visit. */
export function reviewSessionKeysForBusiness(businessId: string): {
  localStorage: string[];
  sessionStorage: string[];
} {
  return {
    localStorage: [],
    sessionStorage: [
      rewardUsedStorageKey(businessId, "spin"),
      rewardUsedStorageKey(businessId, "scratch"),
      rewardPendingScratchKey(businessId),
    ],
  };
}

function collectDelayedModalSessionKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || isProtectedStorageKey(key)) continue;
      if (key.startsWith(DELAYED_REVIEW_MODAL_PREFIX)) keys.push(key);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

/**
 * Clears temporary client state for a public review visit (rewards, review flow, delayed modal flags).
 * Uses an explicit key allowlist only — never Storage.clear() and never admin/auth keys.
 * Preserves `review_locale_v1`, admin session flags, and Supabase auth storage.
 */
export function clearReviewSessionClientState(businessId: string): void {
  if (typeof window === "undefined") return;

  for (const key of reviewFlowLocalStorageKeys()) {
    safeRemoveLocalStorageItem(key);
  }

  const scoped = reviewSessionKeysForBusiness(businessId);
  for (const key of scoped.sessionStorage) {
    safeRemoveSessionStorageItem(key);
  }

  for (const key of collectDelayedModalSessionKeys()) {
    safeRemoveSessionStorageItem(key);
  }

  try {
    delete document.body.dataset.reviewRewardModalOpen;
    delete document.body.dataset.reviewModalOpen;
  } catch {
    /* ignore */
  }
}

export function scheduleReviewSessionExit(
  businessId: string,
  delayMs = 5000,
): () => void {
  if (typeof window === "undefined") return () => {};

  const timer = window.setTimeout(() => {
    clearReviewSessionClientState(businessId);
    window.location.assign(REVIEW_SESSION_EXIT_URL);
  }, delayMs);

  return () => window.clearTimeout(timer);
}
