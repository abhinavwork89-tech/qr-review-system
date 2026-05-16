/** Only model supported in phase 1 provider layer. */
export const AI_ALLOWED_MODEL = "gpt-4.1-mini" as const;

export type AiAllowedModel = typeof AI_ALLOWED_MODEL;

export const AI_REVIEW_LANGUAGES = ["en", "hi", "hinglish"] as const;

export type AiReviewLanguage = (typeof AI_REVIEW_LANGUAGES)[number];

export const AI_GENERATION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "blocked",
] as const;

export type AiGenerationStatus = (typeof AI_GENERATION_STATUSES)[number];
