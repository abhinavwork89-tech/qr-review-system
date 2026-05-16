import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { AI_ALLOWED_MODEL, AI_REVIEW_LANGUAGES, type AiReviewLanguage } from "@/lib/ai/constants";
import { canUseAIReview } from "@/lib/ai/can-use-ai";
import { getGlobalAISettings } from "@/lib/ai/global-settings";
import {
  effectiveBusinessSuggestionsCount,
  getBusinessAISettings,
} from "@/lib/ai/business-settings";
import { estimateAICostUSD } from "@/lib/ai/estimate-cost";
import {
  countCompletedAiGenerationsSince,
  evaluateCooldown,
  evaluateDailyLimit,
  getLastCompletedAiGenerationCreatedAt,
  startOfUtcDay,
  startOfUtcMonth,
} from "@/lib/ai/rate-limits";
import { sumCompletedEstimatedCostUtcMonth } from "@/lib/ai/usage-stats";
import { isValidBusinessUuid } from "@/lib/ai/validate-business-id";
import { getReviewGenCache, reviewGenCacheKey, setReviewGenCache } from "@/lib/ai/review-gen-cache";
import { buildFallbackReviewSuggestions } from "@/lib/ai/review-gen-fallback";
import { generateReviewSuggestionsOpenAI } from "@/lib/ai/review-gen-openai";
import { getOpenAIApiKey } from "@/lib/ai/openai-provider";
import { enforcePublicRateLimits } from "@/lib/security/enforce-public-rate-limit";
import { consumePublicRateLimit, getClientIp } from "@/lib/security/public-rate-limit";
import { createAppLogger, createRouteLogger } from "@/lib/logging/app-logger";
import { rejectOversizedBody } from "@/lib/security/request-body-limit";

const AI_GENERATE_DEBUG = process.env.AI_GENERATE_DEBUG === "1";

function jsonErr(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

function isAiLanguage(v: string): v is AiReviewLanguage {
  return (AI_REVIEW_LANGUAGES as readonly string[]).includes(v);
}

type InsertRow = {
  business_id: string;
  rating: number;
  language: string;
  suggestions_count: number;
  estimated_cost: number;
  model_used: string;
  generation_status: "completed" | "blocked" | "failed";
  ip_address: string | null;
  user_agent: string | null;
  from_cache: boolean;
};

export async function GET() {
  return jsonErr(405, "method_not_allowed", "Use POST.");
}

async function insertGeneration(
  supabase: ReturnType<typeof createServiceRoleClient>,
  row: InsertRow,
): Promise<string | null> {
  const payload: Record<string, unknown> = {
    business_id: row.business_id,
    rating: row.rating,
    language: row.language,
    suggestions_count: row.suggestions_count,
    estimated_cost: row.estimated_cost,
    model_used: row.model_used,
    generation_status: row.generation_status,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    from_cache: row.from_cache,
  };
  const { data, error } = await supabase
    .from("ai_review_generations")
    .insert([payload])
    .select("id")
    .maybeSingle();
  if (error) {
    createAppLogger({ domain: "ai", route: "/api/ai/generate-review" }).error(
      "generation_row_insert_failed",
      {},
    );
    return null;
  }
  const id = data && typeof data === "object" && "id" in data ? (data as { id: unknown }).id : null;
  return id == null ? null : String(id);
}

export async function POST(request: Request) {
  const started = Date.now();

  const tooLarge = rejectOversizedBody(request, 4096);
  if (tooLarge) return tooLarge;

  const h = await headers();
  const log = createRouteLogger("ai", "/api/ai/generate-review", h);
  const aiDebug = (event: string, fields: Record<string, unknown>) => {
    if (AI_GENERATE_DEBUG) log.info(event, fields);
  };
  const ip = getClientIp(h);

  const ipLimited = enforcePublicRateLimits(h, [
    { prefix: "ai:ip", max: 90, windowMs: 60 * 60_000 },
  ]);
  if (ipLimited) {
    return jsonErr(429, "rate_limited", "Too many AI requests. Please try again later.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonErr(400, "invalid_json", "Invalid JSON body");
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return jsonErr(400, "invalid_body", "Body must be an object");
  }

  const o = json as Record<string, unknown>;
  const businessIdRaw =
    typeof o.businessId === "string"
      ? o.businessId.trim()
      : typeof o.business_id === "string"
        ? o.business_id.trim()
        : "";
  const ratingRaw = o.rating;
  const languageRaw =
    typeof o.language === "string" ? o.language.trim().toLowerCase() : "";

  if (!isValidBusinessUuid(businessIdRaw)) {
    return jsonErr(400, "invalid_business", "Invalid business id");
  }

  let rating: number;
  if (typeof ratingRaw === "number" && Number.isInteger(ratingRaw)) {
    rating = ratingRaw;
  } else if (typeof ratingRaw === "string" && /^\d+$/.test(ratingRaw.trim())) {
    rating = Number.parseInt(ratingRaw.trim(), 10);
  } else {
    return jsonErr(400, "invalid_rating", "Rating must be an integer from 1 to 5");
  }
  if (rating < 1 || rating > 5) {
    return jsonErr(400, "invalid_rating", "Rating must be an integer from 1 to 5");
  }

  if (!languageRaw || !isAiLanguage(languageRaw)) {
    return jsonErr(400, "invalid_language", "Unsupported language");
  }
  const language: AiReviewLanguage = languageRaw;

  const burst = consumePublicRateLimit(
    `ai:burst:${ip}:${businessIdRaw}`,
    12,
    60_000,
  );
  if (!burst.allowed) {
    return jsonErr(429, "rate_limited", "Too many AI requests. Please try again later.");
  }

  const ua = h.get("user-agent")?.slice(0, 2000) ?? null;

  const supabase = createServiceRoleClient();
  const global = await getGlobalAISettings();

  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select(
      "id,status,is_active,plan_type,business_type,brand_name,name,ai_enabled,ai_review_language,ai_daily_limit,ai_suggestions_count",
    )
    .eq("id", businessIdRaw)
    .maybeSingle();

  if (bizErr) {
    log.error("business_lookup_failed", { businessId: businessIdRaw });
    return jsonErr(500, "server_error", "Could not load business");
  }
  if (!biz) {
    return jsonErr(404, "not_found", "Business not found");
  }

  const row = biz as Record<string, unknown>;
  const status = normalizeBusinessStatus(row);
  const operational = isBusinessActiveStatus(status);
  const brandName =
    (typeof row.brand_name === "string" && row.brand_name.trim()
      ? row.brand_name.trim()
      : typeof row.name === "string"
        ? row.name.trim()
        : "") || "Business";
  const businessType =
    typeof row.business_type === "string" && row.business_type.trim()
      ? row.business_type.trim()
      : "business";

  const businessAi = getBusinessAISettings(row);
  const gate = canUseAIReview({
    global,
    business: businessAi,
    businessOperational: operational,
  });

  if (!gate.ok) {
    aiDebug("blocked_gate", { businessId: businessIdRaw, reason: gate.reason, ms: Date.now() - started });
    await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: 0,
      estimated_cost: 0,
      model_used: AI_ALLOWED_MODEL,
      generation_status: "blocked",
      ip_address: ip,
      user_agent: ua,
      from_cache: false,
    });
    return jsonErr(403, "ai_unavailable", "AI review assistance is not available for this business.");
  }

  const suggestionsCount = effectiveBusinessSuggestionsCount(row);
  const dayStart = startOfUtcDay(new Date()).toISOString();

  const globalUsed = await countCompletedAiGenerationsSince(supabase, dayStart, null);
  const globalCheck = evaluateDailyLimit(globalUsed, global.ai_daily_global_limit);
  aiDebug("limit_global_daily", { used: globalCheck.used, limit: globalCheck.limit, allowed: globalCheck.allowed });
  if (!globalCheck.allowed) {
    await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: suggestionsCount,
      estimated_cost: 0,
      model_used: AI_ALLOWED_MODEL,
      generation_status: "blocked",
      ip_address: ip,
      user_agent: ua,
      from_cache: false,
    });
    return jsonErr(429, "rate_limited", "Too many AI requests today. Please try again later.");
  }

  const bizUsed = await countCompletedAiGenerationsSince(supabase, dayStart, businessIdRaw);
  const bizCheck = evaluateDailyLimit(bizUsed, businessAi.ai_daily_limit);
  aiDebug("limit_business_daily", { used: bizCheck.used, limit: bizCheck.limit, allowed: bizCheck.allowed });
  if (!bizCheck.allowed) {
    await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: suggestionsCount,
      estimated_cost: 0,
      model_used: AI_ALLOWED_MODEL,
      generation_status: "blocked",
      ip_address: ip,
      user_agent: ua,
      from_cache: false,
    });
    return jsonErr(429, "rate_limited", "Daily AI limit reached for this business.");
  }

  const lastAt = await getLastCompletedAiGenerationCreatedAt(supabase, businessIdRaw);
  const cool = evaluateCooldown(lastAt, global.ai_default_cooldown_seconds);
  aiDebug("limit_cooldown", { blocked: cool.blocked, secondsRemaining: cool.secondsRemaining ?? null });
  if (cool.blocked) {
    await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: suggestionsCount,
      estimated_cost: 0,
      model_used: AI_ALLOWED_MODEL,
      generation_status: "blocked",
      ip_address: ip,
      user_agent: ua,
      from_cache: false,
    });
    return jsonErr(
      429,
      "rate_limited",
      `Please wait ${cool.secondsRemaining ?? global.ai_default_cooldown_seconds}s before another request.`,
    );
  }

  const monthStart = startOfUtcMonth(new Date());
  const spent = await sumCompletedEstimatedCostUtcMonth(supabase, monthStart);
  const budgetUpper = estimateAICostUSD({
    inputTokensEstimate: 900,
    outputTokensEstimate: 900,
    model: AI_ALLOWED_MODEL,
  });
  aiDebug("budget_month", { spent, limit: global.ai_monthly_budget_limit, upperNext: budgetUpper });
  if (
    global.ai_monthly_budget_limit > 0 &&
    spent + budgetUpper > global.ai_monthly_budget_limit
  ) {
    await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: suggestionsCount,
      estimated_cost: 0,
      model_used: AI_ALLOWED_MODEL,
      generation_status: "blocked",
      ip_address: ip,
      user_agent: ua,
      from_cache: false,
    });
    return jsonErr(429, "rate_limited", "AI monthly budget has been reached.");
  }

  const cacheKey = reviewGenCacheKey({
    businessType,
    rating,
    language,
    suggestionsCount,
  });
  const cached = getReviewGenCache(cacheKey);
  if (cached && cached.length === suggestionsCount) {
    aiDebug("cache_hit", { cacheKey, ms: Date.now() - started });
    const est = 0;
    const genId = await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: suggestionsCount,
      estimated_cost: est,
      model_used: AI_ALLOWED_MODEL,
      generation_status: "completed",
      ip_address: ip,
      user_agent: ua,
      from_cache: true,
    });
    return NextResponse.json({
      suggestions: cached,
      estimatedCost: est,
      generationId: genId ?? "",
      cached: true,
      model: AI_ALLOWED_MODEL,
    });
  }
  aiDebug("cache_miss", { cacheKey });

  const fallback = buildFallbackReviewSuggestions({
    rating,
    language,
    count: suggestionsCount,
    brandName,
  });

  const hasKey = Boolean(getOpenAIApiKey());
  if (!hasKey) {
    log.warn("openai_skip_no_key", { ms: Date.now() - started });
    const est = 0;
    const genId = await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: suggestionsCount,
      estimated_cost: est,
      model_used: "fallback-templates",
      generation_status: "completed",
      ip_address: ip,
      user_agent: ua,
      from_cache: false,
    });
    return NextResponse.json({
      suggestions: fallback,
      estimatedCost: est,
      generationId: genId ?? "",
      cached: false,
      model: "fallback-templates",
    });
  }

  const aiRes = await generateReviewSuggestionsOpenAI({
    brandName,
    businessType,
    rating,
    language,
    count: suggestionsCount,
    timeoutMs: 45_000,
  });

  let suggestions: string[] = fallback;
  let modelUsed = "fallback-templates";
  let est = 0;

  if ("suggestions" in aiRes) {
    suggestions = aiRes.suggestions;
    modelUsed = AI_ALLOWED_MODEL;
    est =
      estimateAICostUSD({
        inputTokensEstimate: Math.max(aiRes.inputTokens, 400),
        outputTokensEstimate: Math.max(aiRes.outputTokens, 200),
        model: AI_ALLOWED_MODEL,
      }) || 0;
    setReviewGenCache(cacheKey, suggestions);
    aiDebug("openai_ok", { ms: Date.now() - started, est, tokensIn: aiRes.inputTokens, tokensOut: aiRes.outputTokens });
  } else {
    log.warn("openai_fail", { ms: Date.now() - started, reason: aiRes.error });
    suggestions = fallback;
    modelUsed = "fallback-templates";
    est = 0;
    const genId = await insertGeneration(supabase, {
      business_id: businessIdRaw,
      rating,
      language,
      suggestions_count: suggestionsCount,
      estimated_cost: est,
      model_used: modelUsed,
      generation_status: "completed",
      ip_address: ip,
      user_agent: ua,
      from_cache: false,
    });
    return NextResponse.json({
      suggestions,
      estimatedCost: est,
      generationId: genId ?? "",
      cached: false,
      model: modelUsed,
    });
  }

  const genId = await insertGeneration(supabase, {
    business_id: businessIdRaw,
    rating,
    language,
    suggestions_count: suggestionsCount,
    estimated_cost: est,
    model_used: modelUsed,
    generation_status: "completed",
    ip_address: ip,
    user_agent: ua,
    from_cache: false,
  });

  aiDebug("complete", { ms: Date.now() - started, generationId: genId, modelUsed, est });

  return NextResponse.json({
    suggestions,
    estimatedCost: Number(est.toFixed(8)),
    generationId: genId ?? "",
    cached: false,
    model: modelUsed,
  });
}
