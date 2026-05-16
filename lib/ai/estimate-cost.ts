import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";

/**
 * Heuristic USD estimate (not OpenAI billing). Tunable constants for budgeting dashboards.
 * Placeholder rates for gpt-4.1-mini — replace with current list pricing when known.
 */
const INPUT_PER_1M_USD = 0.4;
const OUTPUT_PER_1M_USD = 1.6;

export type EstimateAICostInput = {
  /** Estimated prompt tokens for one generation request. */
  inputTokensEstimate: number;
  /** Estimated completion tokens (e.g. max suggestions × avg chars / 4). */
  outputTokensEstimate: number;
  /** Must match allowed model or falls back to mini pricing. */
  model?: string;
};

export function estimateAICostUSD(input: EstimateAICostInput): number {
  const model = (input.model ?? AI_ALLOWED_MODEL).trim();
  const inTok = Math.max(0, Math.floor(input.inputTokensEstimate));
  const outTok = Math.max(0, Math.floor(input.outputTokensEstimate));
  if (model !== AI_ALLOWED_MODEL) {
    return 0;
  }
  return (inTok * INPUT_PER_1M_USD) / 1_000_000 + (outTok * OUTPUT_PER_1M_USD) / 1_000_000;
}
