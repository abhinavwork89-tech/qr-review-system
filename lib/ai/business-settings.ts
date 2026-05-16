import type { AiReviewLanguage } from "@/lib/ai/constants";
import { normalizeAiReviewLanguage } from "@/lib/ai/language";
import { effectiveAiSuggestionsCount } from "@/lib/ai/suggestions-by-plan";

export type BusinessAISettings = {
  ai_enabled: boolean;
  ai_review_language: AiReviewLanguage;
  ai_daily_limit: number;
  /** Null means "use plan default" at read time. */
  ai_suggestions_count: number | null;
  plan_type: string | null;
};

export type BusinessAISettingsRow = {
  ai_enabled?: unknown;
  ai_review_language?: unknown;
  ai_daily_limit?: unknown;
  ai_suggestions_count?: unknown;
  plan_type?: unknown;
};

function int(v: unknown, fallback: number, min: number, max: number): number {
  const n =
    typeof v === "number" && Number.isFinite(v)
      ? Math.trunc(v)
      : typeof v === "string" && /^\d+$/.test(v.trim())
        ? Number.parseInt(v.trim(), 10)
        : fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function nullableSmallInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isInteger(v)) {
    const n = Math.min(20, Math.max(1, v));
    return n;
  }
  if (typeof v === "string" && /^\d+$/.test(v.trim())) {
    return Math.min(20, Math.max(1, Number.parseInt(v.trim(), 10)));
  }
  return null;
}

/**
 * Maps a `businesses` row (or partial) to normalized AI settings DTO.
 */
export function getBusinessAISettings(row: BusinessAISettingsRow): BusinessAISettings {
  const plan =
    typeof row.plan_type === "string" && row.plan_type.trim()
      ? row.plan_type.trim()
      : null;
  const stored = nullableSmallInt(row.ai_suggestions_count);
  return {
    ai_enabled: bool(row.ai_enabled, false),
    ai_review_language: normalizeAiReviewLanguage(row.ai_review_language),
    ai_daily_limit: int(row.ai_daily_limit, 50, 1, 50_000),
    ai_suggestions_count: stored,
    plan_type: plan,
  };
}

export function effectiveBusinessSuggestionsCount(row: BusinessAISettingsRow): number {
  const s = getBusinessAISettings(row);
  return effectiveAiSuggestionsCount(s.plan_type, s.ai_suggestions_count);
}
