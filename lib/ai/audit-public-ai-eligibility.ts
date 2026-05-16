import type { GlobalAISettings } from "@/lib/ai/global-settings";
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";
import { getBusinessAISettings } from "@/lib/ai/business-settings";
import type { BusinessAISettingsRow } from "@/lib/ai/business-settings";
import { computePublicAiReviewGenerationEnabled } from "@/lib/ai/compute-public-ai-review-enabled";
import { effectiveBusinessSuggestionsCount } from "@/lib/ai/business-settings";

export type PublicAiEligibilityAudit = {
  global: {
    ai_enabled_global: boolean;
    ai_emergency_disable: boolean;
    ai_model: string;
    modelMatchesAllowed: boolean;
  };
  business: {
    ai_enabled_raw: boolean | null | undefined;
    ai_enabled_normalized: boolean;
    plan_type: string | null;
    ai_suggestions_count: number | null;
    ai_review_language: string | null;
    effective_suggestion_count: number;
    status?: string;
    is_active?: boolean;
  };
  gates: {
    hasGlobalSettings: boolean;
    blockedByEmergency: boolean;
    blockedByGlobalOff: boolean;
    blockedByModel: boolean;
    blockedByBusinessOff: boolean;
  };
  aiReviewGenerationEnabled: boolean;
};

export function auditPublicAiEligibility(
  global: GlobalAISettings | null | undefined,
  business: BusinessAISettingsRow & {
    status?: string;
    is_active?: boolean;
    language?: string | null;
  },
): PublicAiEligibilityAudit {
  const bizAi = getBusinessAISettings(business);
  const model = (global?.ai_model ?? "").trim();
  const modelMatchesAllowed = model === AI_ALLOWED_MODEL;

  const gates = {
    hasGlobalSettings: global != null,
    blockedByEmergency: global?.ai_emergency_disable === true,
    blockedByGlobalOff: global?.ai_enabled_global !== true,
    blockedByModel: !modelMatchesAllowed,
    blockedByBusinessOff: bizAi.ai_enabled !== true,
  };

  const enabled = computePublicAiReviewGenerationEnabled(global, bizAi.ai_enabled);

  return {
    global: {
      ai_enabled_global: global?.ai_enabled_global ?? false,
      ai_emergency_disable: global?.ai_emergency_disable ?? false,
      ai_model: model || "(empty)",
      modelMatchesAllowed,
    },
    business: {
      ai_enabled_raw: business.ai_enabled as boolean | null | undefined,
      ai_enabled_normalized: bizAi.ai_enabled,
      plan_type: bizAi.plan_type,
      ai_suggestions_count:
        typeof business.ai_suggestions_count === "number"
          ? business.ai_suggestions_count
          : null,
      ai_review_language:
        typeof business.ai_review_language === "string"
          ? business.ai_review_language
          : typeof business.language === "string"
            ? business.language
            : null,
      effective_suggestion_count: effectiveBusinessSuggestionsCount(business),
      status: business.status,
      is_active: business.is_active,
    },
    gates,
    aiReviewGenerationEnabled: enabled,
  };
}

const AI_REVIEW_AUDIT_ENABLED =
  process.env.AI_REVIEW_DEBUG === "1" ||
  process.env.NEXT_PUBLIC_AI_REVIEW_DEBUG === "1";

export function logPublicAiEligibilityAudit(
  slug: string,
  audit: PublicAiEligibilityAudit,
): void {
  if (!AI_REVIEW_AUDIT_ENABLED) return;
  if (process.env.NODE_ENV === "production") return;
  console.info(
    `[ai-review-audit] slug=${slug} enabled=${audit.aiReviewGenerationEnabled}`,
    JSON.stringify(audit),
  );
}
