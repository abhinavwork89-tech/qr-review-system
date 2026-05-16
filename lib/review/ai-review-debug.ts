/** Client-only debug for public review AI visibility (set NEXT_PUBLIC_AI_REVIEW_DEBUG=1). */
export const AI_REVIEW_DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_AI_REVIEW_DEBUG === "1";

export function aiReviewDebug(event: string, fields: Record<string, unknown>): void {
  if (!AI_REVIEW_DEBUG) return;
  console.info(`[ai-review-debug] ${event}`, fields);
}
