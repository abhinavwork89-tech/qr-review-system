"use client";

import { memo, useMemo } from "react";
import type { ReviewSentimentCounts } from "@/lib/admin/analytics-extensions";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.max(0, value));
}

export const DashboardSentimentChart = memo(function DashboardSentimentChart({
  sentiment,
  rangeLabel,
}: {
  sentiment: ReviewSentimentCounts;
  rangeLabel: string;
}) {
  const segments = useMemo(
    () => [
      {
        key: "positive",
        label: "Positive (4–5★)",
        count: sentiment.positive,
        className: "bg-emerald-500/90 dark:bg-emerald-400/85",
      },
      {
        key: "neutral",
        label: "Neutral (3★)",
        count: sentiment.neutral,
        className: "bg-amber-400/90 dark:bg-amber-300/85",
      },
      {
        key: "negative",
        label: "Negative (1–2★)",
        count: sentiment.negative,
        className: "bg-rose-500/85 dark:bg-rose-400/80",
      },
    ],
    [sentiment],
  );

  const total = sentiment.total;
  const max = Math.max(sentiment.positive, sentiment.neutral, sentiment.negative, 1);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No reviews in {rangeLabel.toLowerCase()}
      </p>
    );
  }

  return (
    <div className="space-y-4 px-1 py-2">
      <div
        className="flex h-10 w-full overflow-hidden rounded-xl ring-1 ring-zinc-200/80 dark:ring-zinc-700"
        role="img"
        aria-label="Review sentiment distribution"
      >
        {segments.map((seg) =>
          seg.count > 0 ? (
            <div
              key={seg.key}
              className={`${seg.className} min-w-[2px] transition-[width] duration-300`}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${seg.label}: ${formatNumber(seg.count)}`}
            />
          ) : null,
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {segments.map((seg) => (
          <li
            key={seg.key}
            className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40"
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.className}`} />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                {seg.label}
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatNumber(seg.count)}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full ${seg.className}`}
                style={{ width: `${(seg.count / max) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {((seg.count / total) * 100).toFixed(1)}% of reviews
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
});