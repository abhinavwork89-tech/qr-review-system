import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfUtcMonth } from "@/lib/ai/rate-limits";

export type AiUsageMonthlyRow = {
  monthStartIso: string;
  generationCount: number;
  estimatedCostSum: number;
};

export async function countTotalAiGenerations(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("ai_review_generations")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("countTotalAiGenerations", error.message);
    return 0;
  }
  return typeof count === "number" ? count : 0;
}

/**
 * Aggregates generations and estimated cost for rows with created_at in [monthStart, nextMonth).
 */
export async function aggregateAiUsageForUtcMonth(
  supabase: SupabaseClient,
  monthStart: Date,
): Promise<{ generationCount: number; estimatedCostSum: number }> {
  const start = monthStart.toISOString();
  const next = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  ).toISOString();

  const { data, error } = await supabase
    .from("ai_review_generations")
    .select("estimated_cost")
    .gte("created_at", start)
    .lt("created_at", next);

  if (error || !data) {
    if (error) console.error("aggregateAiUsageForUtcMonth", error.message);
    return { generationCount: 0, estimatedCostSum: 0 };
  }

  let sum = 0;
  for (const row of data as { estimated_cost?: unknown }[]) {
    const c = row.estimated_cost;
    if (typeof c === "number" && Number.isFinite(c)) sum += c;
    else if (typeof c === "string" && Number.isFinite(Number.parseFloat(c))) {
      sum += Number.parseFloat(c);
    }
  }
  return { generationCount: data.length, estimatedCostSum: sum };
}

/** Sum estimated USD for completed generations in UTC month (budget guard). */
export async function sumCompletedEstimatedCostUtcMonth(
  supabase: SupabaseClient,
  monthStart: Date,
): Promise<number> {
  const start = monthStart.toISOString();
  const next = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  ).toISOString();

  const { data, error } = await supabase
    .from("ai_review_generations")
    .select("estimated_cost")
    .gte("created_at", start)
    .lt("created_at", next)
    .eq("generation_status", "completed");

  if (error || !data) {
    if (error) console.error("sumCompletedEstimatedCostUtcMonth", error.message);
    return 0;
  }

  let sum = 0;
  for (const row of data as { estimated_cost?: unknown }[]) {
    const c = row.estimated_cost;
    if (typeof c === "number" && Number.isFinite(c)) sum += c;
    else if (typeof c === "string" && Number.isFinite(Number.parseFloat(c))) {
      sum += Number.parseFloat(c);
    }
  }
  return sum;
}

export async function currentUtcMonthAiUsage(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<AiUsageMonthlyRow> {
  const ms = startOfUtcMonth(now);
  const agg = await aggregateAiUsageForUtcMonth(supabase, ms);
  return {
    monthStartIso: ms.toISOString(),
    generationCount: agg.generationCount,
    estimatedCostSum: agg.estimatedCostSum,
  };
}

export type TopBusinessAiRow = {
  business_id: string;
  generation_count: number;
};

/**
 * Top N businesses by generation count (all time). For future admin charts.
 */
export type AiPeriodDashboardStats = {
  periodGenerations: number;
  cachedGenerations: number;
  openAiGenerations: number;
  periodEstimatedCostUsd: number;
};

export async function fetchAiPeriodDashboardStats(
  supabase: SupabaseClient,
  sinceIso: string,
): Promise<AiPeriodDashboardStats | null> {
  const { data, error } = await supabase.rpc("ai_dashboard_period_stats", {
    since_at: sinceIso,
  });
  if (error) {
    console.error("fetchAiPeriodDashboardStats", error.message);
    return null;
  }
  const row = data as Record<string, unknown> | null;
  if (!row || typeof row !== "object") return null;
  const parseIntField = (k: string) => {
    const v = row[k];
    return typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : 0;
  };
  const costRaw = row.period_estimated_cost_usd;
  const periodEstimatedCostUsd =
    typeof costRaw === "number" && Number.isFinite(costRaw)
      ? costRaw
      : typeof costRaw === "string" && Number.isFinite(Number.parseFloat(costRaw))
        ? Number.parseFloat(costRaw)
        : 0;
  return {
    periodGenerations: parseIntField("period_generations"),
    cachedGenerations: parseIntField("cached_generations"),
    openAiGenerations: parseIntField("open_ai_generations"),
    periodEstimatedCostUsd,
  };
}

export async function topBusinessesByAiGenerationsSince(
  supabase: SupabaseClient,
  sinceIso: string,
  limit: number,
): Promise<TopBusinessAiRow[]> {
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  const { data, error } = await supabase.rpc("ai_top_businesses_since", {
    since_at: sinceIso,
    row_limit: lim,
  });
  if (error) {
    console.error("topBusinessesByAiGenerationsSince", error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return (data as { business_id?: string; generation_count?: number | bigint }[])
    .filter((r) => typeof r.business_id === "string")
    .map((r) => ({
      business_id: r.business_id as string,
      generation_count: Number(r.generation_count ?? 0),
    }));
}

export async function topBusinessesByAiGenerations(
  supabase: SupabaseClient,
  limit: number,
): Promise<TopBusinessAiRow[]> {
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  const { data, error } = await supabase.rpc("ai_top_businesses_by_generations", {
    row_limit: lim,
  });
  if (error) {
    console.error("topBusinessesByAiGenerations", error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return (data as { business_id?: string; generation_count?: number | bigint }[])
    .filter((r) => typeof r.business_id === "string")
    .map((r) => ({
      business_id: r.business_id as string,
      generation_count: Number(r.generation_count ?? 0),
    }));
}
