import type { AiReviewLanguage } from "@/lib/ai/constants";
import { AI_REVIEW_LANGUAGES } from "@/lib/ai/constants";

const SET = new Set<string>(AI_REVIEW_LANGUAGES);

export function normalizeAiReviewLanguage(raw: unknown): AiReviewLanguage {
  if (typeof raw !== "string") return "en";
  const t = raw.trim().toLowerCase();
  if (SET.has(t)) return t as AiReviewLanguage;
  return "en";
}
