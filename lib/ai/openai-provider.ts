/**
 * Server-only OpenAI HTTP helper. Do not import from client components.
 * Phase 1: transport + timeout only — no review generation APIs are called from routes yet.
 */
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";

export const OPENAI_V1_BASE = "https://api.openai.com/v1";

export const OPENAI_DEFAULT_TIMEOUT_MS = 45_000;

export function getOpenAIApiKey(): string | null {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

export function assertOpenAIApiKeyConfigured(): void {
  if (!getOpenAIApiKey()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
}

export type OpenAIJsonResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string; body?: unknown };

/**
 * POST JSON to OpenAI REST API with AbortSignal timeout.
 * Caller supplies full path including `/v1/...` prefix or relative to base.
 */
export async function openaiPostJson(
  path: string,
  body: unknown,
  options?: { timeoutMs?: number },
): Promise<OpenAIJsonResult> {
  const key = getOpenAIApiKey();
  if (!key) {
    return { ok: false, status: 0, error: "OPENAI_API_KEY is not configured" };
  }
  const timeoutMs = options?.timeoutMs ?? OPENAI_DEFAULT_TIMEOUT_MS;
  const url = path.startsWith("http") ? path : `${OPENAI_V1_BASE.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      const msg =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof (parsed as { error?: { message?: string } }).error?.message === "string"
          ? (parsed as { error: { message: string } }).error.message
          : `OpenAI HTTP ${res.status}`;
      return { ok: false, status: res.status, error: msg, body: parsed };
    }
    return { ok: true, status: res.status, data: parsed };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") {
      return { ok: false, status: 0, error: `OpenAI request timed out after ${timeoutMs}ms` };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** Phase 2 will call chat.completions; structure only. */
export function buildAllowedChatModel(): string {
  return AI_ALLOWED_MODEL;
}

export type OpenAIProvider = {
  readonly model: string;
  readonly timeoutMs: number;
  isConfigured(): boolean;
  /** Reserved for health checks — optional, avoids shipping unused network calls in phase 1. */
  postChatCompletionsReserved(_body: unknown): Promise<OpenAIJsonResult>;
};

export function createOpenAIProvider(opts?: { timeoutMs?: number }): OpenAIProvider {
  const timeoutMs = opts?.timeoutMs ?? OPENAI_DEFAULT_TIMEOUT_MS;
  return {
    model: AI_ALLOWED_MODEL,
    timeoutMs,
    isConfigured: () => Boolean(getOpenAIApiKey()),
    postChatCompletionsReserved: (body: unknown) =>
      openaiPostJson("/chat/completions", body, { timeoutMs }),
  };
}
