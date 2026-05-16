import type { SupabaseClient } from "@supabase/supabase-js";

import { startOfUtcDay, startOfUtcMonth } from "@/lib/ai/rate-limits";

import {

  aggregateAiUsageForUtcMonth,

  countTotalAiGenerations,

  fetchAiPeriodDashboardStats,

  topBusinessesByAiGenerations,

  topBusinessesByAiGenerationsSince,

} from "@/lib/ai/usage-stats";

import { normalizeBusinessStatus } from "@/lib/business/status";



export type ReviewSentimentCounts = {

  positive: number;

  neutral: number;

  negative: number;

  total: number;

};



export type SubscriptionCounts = {

  active: number;

  inactive: number;

  total: number;

};



export type DashboardAiAnalytics = {

  totalAllTime: number;

  periodGenerations: number;

  monthGenerations: number;

  periodEstimatedCostUsd: number;

  todayEstimatedCostUsd: number;

  monthEstimatedCostUsd: number;

  avgCostPerGenerationUsd: number | null;

  cachedGenerations: number;

  openAiGenerations: number;

  topBusinesses: Array<{ businessId: string; name: string; count: number }>;

};



function parseCost(v: unknown): number {

  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (typeof v === "string" && Number.isFinite(Number.parseFloat(v))) {

    return Number.parseFloat(v);

  }

  return 0;

}



export function classifyReviewSentiment(

  reviews: Array<{ rating?: unknown }>,

): ReviewSentimentCounts {

  let positive = 0;

  let neutral = 0;

  let negative = 0;

  for (const r of reviews) {

    const n = typeof r.rating === "number" ? Math.round(r.rating) : 0;

    if (n >= 4) positive += 1;

    else if (n === 3) neutral += 1;

    else if (n >= 1) negative += 1;

  }

  return {

    positive,

    neutral,

    negative,

    total: positive + neutral + negative,

  };

}



export function countSubscriptions(

  businesses: Array<Record<string, unknown>>,

): SubscriptionCounts {

  let active = 0;

  let inactive = 0;

  for (const row of businesses) {

    const status = normalizeBusinessStatus(row);

    if (status === "deleted") continue;

    if (status === "active") active += 1;

    else inactive += 1;

  }

  return { active, inactive, total: active + inactive };

}



export async function buildDashboardAiAnalytics(

  supabase: SupabaseClient,

  sinceIso: string,

  labelById: Map<string, string>,

): Promise<DashboardAiAnalytics> {

  const now = new Date();

  const todayStart = startOfUtcDay(now).toISOString();

  const monthStart = startOfUtcMonth(now);



  const [totalAllTime, monthAgg, periodStats, todayRes, topPeriod, topAll] =

    await Promise.all([

      countTotalAiGenerations(supabase),

      aggregateAiUsageForUtcMonth(supabase, monthStart),

      fetchAiPeriodDashboardStats(supabase, sinceIso),

      supabase

        .from("ai_review_generations")

        .select("estimated_cost")

        .gte("created_at", todayStart)

        .eq("generation_status", "completed"),

      topBusinessesByAiGenerationsSince(supabase, sinceIso, 8),

      topBusinessesByAiGenerations(supabase, 8),

    ]);



  let periodGenerations = periodStats?.periodGenerations ?? 0;
  let cachedGenerations = periodStats?.cachedGenerations ?? 0;
  let openAiGenerations = periodStats?.openAiGenerations ?? 0;
  let periodCost = periodStats?.periodEstimatedCostUsd ?? 0;

  if (!periodStats) {
    const [periodCountRes, cachedCountRes, openaiCountRes] = await Promise.all([
      supabase
        .from("ai_review_generations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso),
      supabase
        .from("ai_review_generations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso)
        .eq("from_cache", true),
      supabase
        .from("ai_review_generations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso)
        .eq("from_cache", false),
    ]);
    if (typeof periodCountRes.count === "number") {
      periodGenerations = periodCountRes.count;
    }
    if (typeof cachedCountRes.count === "number") {
      cachedGenerations = cachedCountRes.count;
    }
    if (typeof openaiCountRes.count === "number") {
      openAiGenerations = openaiCountRes.count;
    }
    const { data: costRows } = await supabase
      .from("ai_review_generations")
      .select("estimated_cost")
      .gte("created_at", sinceIso)
      .eq("generation_status", "completed");
    for (const row of (costRows ?? []) as { estimated_cost?: unknown }[]) {
      periodCost += parseCost(row.estimated_cost);
    }
  }



  let todayCost = 0;

  for (const row of (todayRes.data ?? []) as { estimated_cost?: unknown }[]) {

    todayCost += parseCost(row.estimated_cost);

  }



  const avgCostPerGenerationUsd =

    periodGenerations > 0

      ? Math.round((periodCost / periodGenerations) * 1_000_000) / 1_000_000

      : null;



  const topFromPeriod = topPeriod.map((r) => ({

    businessId: r.business_id,

    name: labelById.get(r.business_id) ?? "Business",

    count: r.generation_count,

  }));



  const topBusinesses =

    topFromPeriod.length > 0

      ? topFromPeriod

      : topAll.map((r) => ({

          businessId: r.business_id,

          name: labelById.get(r.business_id) ?? "Business",

          count: r.generation_count,

        }));



  return {

    totalAllTime,

    periodGenerations,

    monthGenerations: monthAgg.generationCount,

    periodEstimatedCostUsd: Math.round(periodCost * 10_000) / 10_000,

    todayEstimatedCostUsd: Math.round(todayCost * 10_000) / 10_000,

    monthEstimatedCostUsd: Math.round(monthAgg.estimatedCostSum * 10_000) / 10_000,

    avgCostPerGenerationUsd,

    cachedGenerations,

    openAiGenerations,

    topBusinesses,

  };

}

