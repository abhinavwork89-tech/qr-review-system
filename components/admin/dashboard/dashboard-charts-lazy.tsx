"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

function ChartSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800/80 ${tall ? "min-h-48" : "min-h-36"}`}
      aria-hidden
    />
  );
}

const DashboardTrendChart = dynamic(
  () =>
    import("@/components/admin/dashboard/dashboard-trend-chart").then((m) => ({
      default: m.DashboardTrendChart,
    })),
  { loading: () => <ChartSkeleton /> },
);

const DashboardSentimentChart = dynamic(
  () =>
    import("@/components/admin/dashboard/dashboard-sentiment-chart").then((m) => ({
      default: m.DashboardSentimentChart,
    })),
  { loading: () => <ChartSkeleton /> },
);

const DashboardAiSection = dynamic(
  () =>
    import("@/components/admin/dashboard/dashboard-ai-section").then((m) => ({
      default: m.DashboardAiSection,
    })),
  { loading: () => <ChartSkeleton tall /> },
);

export function LazyDashboardTrendChart(
  props: ComponentProps<typeof DashboardTrendChart>,
) {
  return <DashboardTrendChart {...props} />;
}

export function LazyDashboardSentimentChart(
  props: ComponentProps<typeof DashboardSentimentChart>,
) {
  return <DashboardSentimentChart {...props} />;
}

export function LazyDashboardAiSection(
  props: ComponentProps<typeof DashboardAiSection>,
) {
  return <DashboardAiSection {...props} />;
}
