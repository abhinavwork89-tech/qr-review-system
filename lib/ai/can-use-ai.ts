import type { GlobalAISettings } from "@/lib/ai/global-settings";
import type { BusinessAISettings } from "@/lib/ai/business-settings";
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";

export type CanUseAIReviewInput = {
  global: GlobalAISettings;
  business: BusinessAISettings;
  /** When false, AI is blocked regardless of toggles. */
  businessOperational?: boolean;
  /** Optional: model must be allowed (phase 1: mini only). */
  modelOverride?: string | null;
};

export type CanUseAIReviewResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * AI is allowed only when global + business toggles are on, no emergency kill-switch,
 * and the business is in an operational state (caller supplies `businessOperational`).
 */
export function canUseAIReview(input: CanUseAIReviewInput): CanUseAIReviewResult {
  const g = input.global;
  if (g.ai_emergency_disable) {
    return { ok: false, reason: "ai_emergency_disable" };
  }
  if (!g.ai_enabled_global) {
    return { ok: false, reason: "ai_disabled_global" };
  }
  if (!input.business.ai_enabled) {
    return { ok: false, reason: "ai_disabled_business" };
  }
  if (input.businessOperational === false) {
    return { ok: false, reason: "business_not_operational" };
  }
  const model = (input.modelOverride ?? g.ai_model).trim();
  if (model !== AI_ALLOWED_MODEL) {
    return { ok: false, reason: "ai_model_not_allowed" };
  }
  return { ok: true };
}
