/** sessionStorage keys for reward replay prevention (must match review-reward-games). */
export function rewardUsedStorageKey(
  businessId: string,
  kind: "spin" | "scratch",
): string {
  return `reward:${kind}:${businessId}`;
}

export function rewardPendingScratchKey(businessId: string): string {
  return `reward:scratch:pending:${businessId}`;
}

export const DELAYED_REVIEW_MODAL_PREFIX = "delayed-review-once:" as const;

export function delayedReviewModalKey(pageSlug: string, googleReviewUrl: string): string {
  const slugPart = pageSlug.trim().toLowerCase() || "page";
  const g = googleReviewUrl.trim().toLowerCase() || "no-google";
  return `${DELAYED_REVIEW_MODAL_PREFIX}${slugPart}:${g}`;
}
