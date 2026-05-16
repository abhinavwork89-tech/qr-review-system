"use client";

import { Bot, Coins, Database, Sparkles, Zap } from "lucide-react";
import { useMemo } from "react";
import { ChartCard } from "@/components/admin/dashboard/chart-card";
import { StatsCard } from "@/components/admin/dashboard/stats-card";
import type { DashboardAiAnalytics } from "@/lib/admin/analytics-extensions";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.max(0, value));
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Math.max(0, value));
}

export function DashboardAiSection({
  ai,
  rangeLabel,
  loading,
}: {
  ai: DashboardAiAnalytics | null | undefined;
  rangeLabel: string;
  loading: boolean;
}) {
  const cards = useMemo(() => {
    if (!ai) return [];
    return [
      {
        title: "AI generations (period)",
        value: formatNumber(ai.periodGenerations),
        growth: "—",
        growthCaption: rangeLabel,
        icon: Sparkles,
      },
      {
        title: "AI generations (month)",
        value: formatNumber(ai.monthGenerations),
        growth: "—",
        growthCaption: "UTC calendar month",
        icon: Bot,
      },
      {
        title: "Est. cost (period)",
        value: formatUsd(ai.periodEstimatedCostUsd),
        growth: "—",
        growthCaption: rangeLabel,
        icon: Coins,
      },
      {
        title: "Est. cost today",
        value: formatUsd(ai.todayEstimatedCostUsd),
        growth: "—",
        growthCaption: "UTC day · completed rows",
        icon: Zap,
      },
      {
        title: "Est. cost (month)",
        value: formatUsd(ai.monthEstimatedCostUsd),
        growth: "—",
        growthCaption: "UTC calendar month",
        icon: Coins,
      },
      {
        title: "Avg cost / generation",
        value:
          ai.avgCostPerGenerationUsd != null
            ? formatUsd(ai.avgCostPerGenerationUsd)
            : "—",
        growth: "—",
        growthCaption: `In ${rangeLabel.toLowerCase()}`,
        icon: Database,
      },
    ];
  }, [ai, rangeLabel]);

  const cacheLabel = ai
    ? `${formatNumber(ai.cachedGenerations)} cached · ${formatNumber(ai.openAiGenerations)} OpenAI`
    : "";

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          AI usage
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-200/80 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!ai) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          AI usage
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {formatNumber(ai.totalAllTime)} all-time · {cacheLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((item) => (
          <StatsCard key={item.title} {...item} />
        ))}
      </div>

      <ChartCard
        title="Top AI-using businesses"
        subtitle={`By generations in ${rangeLabel.toLowerCase()} (fallback: all-time)`}
        hasData={ai.topBusinesses.length > 0}
      >
        <ul className="max-h-56 space-y-2 overflow-auto pr-1 text-xs">
          {ai.topBusinesses.length === 0 ? (
            <li className="rounded-lg border border-dashed border-zinc-200/80 px-2.5 py-3 text-center text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              No AI generations yet
            </li>
          ) : (
            ai.topBusinesses.map((row) => (
              <li
                key={row.businessId}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <span className="min-w-0 truncate font-medium text-zinc-800 dark:text-zinc-200">
                  {row.name}
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatNumber(row.count)}
                </span>
              </li>
            ))
          )}
        </ul>
      </ChartCard>
    </div>
  );
}
