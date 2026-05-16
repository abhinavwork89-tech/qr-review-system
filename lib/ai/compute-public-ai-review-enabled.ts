import type { GlobalAISettings } from "@/lib/ai/global-settings";
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";

/** Server-computed flag for public review UI: when true, client may call POST /api/ai/generate-review. */
export function computePublicAiReviewGenerationEnabled(
  global: GlobalAISettings | null | undefined,
  businessAiEnabled: boolean | null | undefined,
): boolean {
  if (!global) return false;
  if (global.ai_emergency_disable) return false;
  if (!global.ai_enabled_global) return false;
  const model = global.ai_model.trim();
  if (model !== AI_ALLOWED_MODEL) return false;
  return businessAiEnabled === true;
}
