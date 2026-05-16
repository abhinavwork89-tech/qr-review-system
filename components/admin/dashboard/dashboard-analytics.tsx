"use client";

import {
  Building2,
  CircleDollarSign,
  MessageSquareText,
  Star,
  Store,
  UserCheck,
  UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChartCard } from "@/components/admin/dashboard/chart-card";
import {
  LazyDashboardAiSection,
  LazyDashboardSentimentChart,
  LazyDashboardTrendChart,
} from "@/components/admin/dashboard/dashboard-charts-lazy";
import type { TrendGranularity } from "@/components/admin/dashboard/dashboard-trend-chart";
import { StatsCard } from "@/components/admin/dashboard/stats-card";
import type {
  DashboardAiAnalytics,
  ReviewSentimentCounts,
  SubscriptionCounts,
} from "@/lib/admin/analytics-extensions";
import { displayQrTypeLabel } from "@/lib/scan/qr-types";

type RangeDays = 1 | 7 | 30;

type AnalyticsJson = {
  days: RangeDays;
  since: string;
  totalBusinesses: number;
  totalScans: number;
  totalReviews: number;
  averageRating: number | null;
  conversionRate: number;
  scansByQrType: Record<string, number>;
  recentScans: Array<{
    id: string;
    business_id: string;
    businessLabel: string;
    qr_type: string | null;
    created_at: string;
    referrer: string | null;
  }>;
  recentReviews: Array<{
    id: string;
    business_id: string;
    businessLabel: string;
    rating: number;
    name: string;
    review_text: string;
    created_at: string;
  }>;
  businessStats: Array<{
    id: string;
    name: string;
    scans: number;
    reviews: number;
  }>;
  trendGranularity?: TrendGranularity;
  trendSeries?: unknown;
  sentiment?: ReviewSentimentCounts;
  subscriptions?: SubscriptionCounts;
  ai?: DashboardAiAnalytics | null;
};

const RANGE_OPTIONS: { days: RangeDays; label: string }[] = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.max(0, value));
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function normalizeTrendGranularity(raw: unknown): TrendGranularity {
  return raw === "hour" ? "hour" : "day";
}

function formatShortDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function DashboardAnalytics() {
  const [days, setDays] = useState<RangeDays>(30);
  const [data, setData] = useState<AnalyticsJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/analytics?days=${days}`, {
          method: "GET",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const raw = await res.text();
        let parsed: (AnalyticsJson & { error?: string }) | null = null;
        try {
          parsed = raw
            ? (JSON.parse(raw) as AnalyticsJson & { error?: string })
            : null;
        } catch {
          parsed = null;
        }
        if (!active) return;
        if (!res.ok) {
          setData(null);
          setError(parsed?.error || `Request failed (${res.status})`);
          return;
        }
        if (
          !parsed ||
          typeof parsed.totalScans !== "number" ||
          typeof parsed.totalReviews !== "number" ||
          typeof parsed.totalBusinesses !== "number"
        ) {
          setData(null);
          setError("Invalid analytics response");
          return;
        }
        setData(parsed);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (!active) return;
        setData(null);
        setError("Network error. Try again.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [days]);

  const rangeLabel = useMemo(
    () => RANGE_OPTIONS.find((o) => o.days === days)?.label ?? `${days} days`,
    [days],
  );

  const qrRows = useMemo(() => {
    if (!data?.scansByQrType) return [];
    return Object.entries(data.scansByQrType)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [data]);

  const maxQr = useMemo(
    () => qrRows.reduce((m, r) => Math.max(m, r.count), 0),
    [qrRows],
  );

  const stats = data
    ? [
        {
          title: "Total Businesses",
          value: formatNumber(data.totalBusinesses),
          growth: "—",
          growthCaption: `Non-deleted businesses · ${rangeLabel}`,
          icon: Building2,
        },
        {
          title: "Total Scans",
          value: formatNumber(data.totalScans),
          growth: "—",
          growthCaption: rangeLabel,
          icon: Store,
        },
        {
          title: "Total Reviews",
          value: formatNumber(data.totalReviews),
          growth: "—",
          growthCaption: rangeLabel,
          icon: MessageSquareText,
        },
        {
          title: "Avg. rating",
          value:
            data.averageRating != null ? formatPercent(data.averageRating) : "—",
          growth: "—",
          growthCaption: rangeLabel,
          icon: Star,
        },
        {
          title: "Conversion rate",
          value: `${formatPercent(data.conversionRate)}%`,
          growth: "—",
          growthCaption: "Reviews ÷ scans in this period",
          icon: CircleDollarSign,
        },
      ]
    : [];

  const businessRows = data?.businessStats ?? [];
  const hasBusinessStatsRows = businessRows.length > 0;

  const trendGranularity = useMemo(
    () => normalizeTrendGranularity(data?.trendGranularity),
    [data?.trendGranularity],
  );

  const trendCardReady = !error && (loading || data != null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Analytics period
        </p>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                days === opt.days
                  ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-200/80 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60"
            />
          ))}
        </div>
      ) : data && stats.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((item) => (
            <StatsCard
              key={item.title}
              title={item.title}
              value={item.value}
              growth={item.growth}
              growthCaption={item.growthCaption}
              icon={item.icon}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white text-sm font-medium text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No analytics data
        </div>
      )}

      {data?.subscriptions ? (
        <div className="grid grid-cols-2 gap-4 lg:max-w-xl">
          <StatsCard
            title="Active subscriptions"
            value={formatNumber(data.subscriptions.active)}
            growth="—"
            growthCaption="Non-deleted · status active"
            icon={UserCheck}
          />
          <StatsCard
            title="Inactive subscriptions"
            value={formatNumber(data.subscriptions.inactive)}
            growth="—"
            growthCaption="Non-deleted · status inactive"
            icon={UserX}
          />
        </div>
      ) : null}

      <LazyDashboardAiSection ai={data?.ai} rangeLabel={rangeLabel} loading={loading} />

      <ChartCard
        title="Review sentiment"
        subtitle={`Positive 4–5★ · Neutral 3★ · Negative 1–2★ · ${rangeLabel}`}
        hasData={!loading && (data?.sentiment?.total ?? 0) > 0}
      >
        {loading && !data?.sentiment ? (
          <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>
        ) : data?.sentiment ? (
          <LazyDashboardSentimentChart sentiment={data.sentiment} rangeLabel={rangeLabel} />
        ) : null}
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <ChartCard
            title="Scans by QR type"
            subtitle={`Distribution in the last ${rangeLabel.toLowerCase()}`}
            hasData={qrRows.length > 0}
          >
            <div className="space-y-3 px-1 py-2">
              {qrRows.map((row) => (
                <div key={row.key} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {displayQrTypeLabel(row.key)}
                  </div>
                  <div className="relative h-7 min-w-0 flex-1 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-indigo-500/85 dark:bg-indigo-400/80"
                      style={{
                        width: maxQr > 0 ? `${Math.max(8, (row.count / maxQr) * 100)}%` : "8%",
                      }}
                    />
                    <span className="relative z-10 flex h-full items-center px-2 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatNumber(row.count)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard
            title="Recent activity"
            subtitle="Latest scans and reviews in this period"
            hasData={!loading && data != null}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Recent scans
                </p>
                <ul className="max-h-64 space-y-2 overflow-auto pr-1 text-xs">
                  {(data?.recentScans?.length ?? 0) === 0 ? (
                    <li className="rounded-lg border border-dashed border-zinc-200/80 px-2.5 py-3 text-center text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      No scans in this period
                    </li>
                  ) : (
                    (data?.recentScans ?? []).map((s) => (
                      <li
                        key={s.id}
                        className="rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-950/40"
                      >
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {s.businessLabel}
                        </p>
                        <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                          {displayQrTypeLabel(s.qr_type)} ·{" "}
                          {formatShortDate(s.created_at)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Recent reviews
                </p>
                <ul className="max-h-64 space-y-2 overflow-auto pr-1 text-xs">
                  {(data?.recentReviews?.length ?? 0) === 0 ? (
                    <li className="rounded-lg border border-dashed border-zinc-200/80 px-2.5 py-3 text-center text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      No reviews in this period
                    </li>
                  ) : (
                    (data?.recentReviews ?? []).map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-950/40"
                      >
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {r.name || "Anonymous"}{" "}
                          <span className="text-zinc-500 dark:text-zinc-400">
                            · ★{r.rating}
                          </span>
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-zinc-600 dark:text-zinc-300">
                          {r.review_text || "—"}
                        </p>
                        <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                          {r.businessLabel} · {formatShortDate(r.created_at)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </ChartCard>
        </div>

        <ChartCard
          title="Business Types"
          subtitle="Per business scan and review totals (period)"
          hasData={hasBusinessStatsRows}
        >
          <div className="h-64 overflow-auto rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="space-y-2">
              {loading ? (
                <p className="text-center text-xs text-zinc-500">Loading…</p>
              ) : (
                businessRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-zinc-900/60"
                  >
                    <p className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                      {row.name}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">{`Scans: ${formatNumber(row.scans)}`}</p>
                    <p className="text-zinc-600 dark:text-zinc-300">{`Reviews: ${formatNumber(row.reviews)}`}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Activity trend"
        subtitle={`QR scans vs reviews from scan_logs & reviews · UTC · ${rangeLabel}${
          trendGranularity === "hour"
            ? " · hourly buckets"
            : " · daily buckets"
        }`}
        hasData={trendCardReady}
      >
        <LazyDashboardTrendChart
          granularity={trendGranularity}
          series={data?.trendSeries}
          loading={loading && !data?.trendSeries}
          rangeLabel={rangeLabel}
        />
      </ChartCard>
    </div>
  );
}
