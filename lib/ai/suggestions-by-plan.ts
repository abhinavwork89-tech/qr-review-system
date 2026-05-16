/**
 * Default suggestion counts by subscription plan when `ai_suggestions_count` is NULL.
 */
export function defaultSuggestionsForPlan(planType: string | null | undefined): number {
  const p = (planType ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (p === "pro_plus") return 5;
  if (p === "pro") return 3;
  return 1;
}

export function effectiveAiSuggestionsCount(
  planType: string | null | undefined,
  stored: number | null | undefined,
): number {
  if (typeof stored === "number" && Number.isInteger(stored)) {
    const n = Math.min(20, Math.max(1, stored));
    return n;
  }
  return defaultSuggestionsForPlan(planType);
}
