import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";
import type { AiReviewLanguage } from "@/lib/ai/constants";
import { openaiPostJson } from "@/lib/ai/openai-provider";
import { sanitizeReviewSuggestionList } from "@/lib/ai/review-gen-sanitize";

export type ReviewGenOpenAiOk = {
  suggestions: string[];
  inputTokens: number;
  outputTokens: number;
};

export type ReviewGenOpenAiErr = { error: string };

function buildUserPrompt(input: {
  brandName: string;
  businessType: string;
  rating: number;
  language: AiReviewLanguage;
  count: number;
}): string {
  const brand = input.brandName.trim() || "the business";
  const bt = input.businessType.trim() || "business";
  return [
    `Return ONLY valid JSON: {"suggestions":["..."]} with exactly ${input.count} string items.`,
    `Each string: plain text, single line, ${80}–${220} characters, language=${input.language}.`,
    `Rating context: ${input.rating} stars (1–2 = honest/critical-leaning, 3 = balanced, 4–5 = clearly positive).`,
    `Business category (do not invent specific services or events): ${bt}.`,
    `Brand name for optional natural use in SOME lines only (not every line): ${brand}.`,
    "Style: human, conversational, slight variation between lines; use at most one emoji on roughly one third of lines (rating-aware: 5★ may use 😊✨👍, 3★ sparingly 🙂, 1–2★ rarely 😕), never every line, not corporate polish.",
    "Do not include URLs, HTML, hashtags, quotes inside strings that break JSON, or personal data requests.",
    "Do not claim discounts, medical outcomes, or legal results.",
  ].join("\n");
}

function buildSystemPrompt(): string {
  return [
    "You help customers draft short public review lines.",
    "You only output JSON as instructed. Never output markdown fences or explanations outside JSON.",
  ].join(" ");
}

function parseUsage(data: unknown): { input: number; output: number } {
  if (!data || typeof data !== "object") return { input: 0, output: 0 };
  const u = (data as { usage?: unknown }).usage;
  if (!u || typeof u !== "object") return { input: 0, output: 0 };
  const o = u as Record<string, unknown>;
  const input = typeof o.prompt_tokens === "number" ? o.prompt_tokens : 0;
  const output = typeof o.completion_tokens === "number" ? o.completion_tokens : 0;
  return { input, output };
}

function parseSuggestionsJson(data: unknown, expected: number): string[] | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as Record<string, unknown>)?.message as Record<string, unknown> | undefined;
  const content = typeof msg?.content === "string" ? msg.content.trim() : "";
  if (!content) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const suggestions = (parsed as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) return null;
  return sanitizeReviewSuggestionList(suggestions as unknown[], expected);
}

export async function generateReviewSuggestionsOpenAI(input: {
  brandName: string;
  businessType: string;
  rating: number;
  language: AiReviewLanguage;
  count: number;
  timeoutMs?: number;
}): Promise<ReviewGenOpenAiOk | ReviewGenOpenAiErr> {
  const body = {
    model: AI_ALLOWED_MODEL,
    temperature: 0.88,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input) },
    ],
  };

  const attempt = async () =>
    openaiPostJson("/chat/completions", body, { timeoutMs: input.timeoutMs ?? 45_000 });

  let res = await attempt();
  if (!res.ok && (res.status === 502 || res.status === 503 || res.status === 504 || res.status === 0)) {
    await new Promise((r) => setTimeout(r, 400));
    res = await attempt();
  }

  if (!res.ok) {
    return { error: res.error };
  }

  const suggestions = parseSuggestionsJson(res.data, input.count);
  if (!suggestions) {
    return { error: "malformed_model_output" };
  }

  const usage = parseUsage(res.data);
  return { suggestions, inputTokens: usage.input, outputTokens: usage.output };
}
