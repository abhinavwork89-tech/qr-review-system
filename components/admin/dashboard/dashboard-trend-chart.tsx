"use client";

import { useCallback, useId, useMemo, useState } from "react";

export type TrendGranularity = "hour" | "day";

export type TrendSeriesPoint = {
  bucketStart: string;
  scans: number;
  reviews: number;
};

function safeNonNeg(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.floor(x);
}

function parseSeries(raw: unknown): TrendSeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    const bucketStart =
      typeof r.bucketStart === "string" ? r.bucketStart : "";
    return {
      bucketStart,
      scans: safeNonNeg(r.scans),
      reviews: safeNonNeg(r.reviews),
    };
  });
}

function formatTooltipDate(iso: string, granularity: TrendGranularity): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function formatAxisTick(iso: string, granularity: TrendGranularity): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

type Props = {
  granularity: TrendGranularity;
  series: unknown;
  loading?: boolean;
  rangeLabel: string;
};

const VIEW_W = 560;
const VIEW_H = 220;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 36;

function buildLinePath(xs: number[], ys: number[]): string {
  if (xs.length === 0 || ys.length === 0 || xs.length !== ys.length) return "";
  let d = `M ${xs[0]},${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    d += ` L ${xs[i]},${ys[i]}`;
  }
  return d;
}

function buildAreaPath(xs: number[], ys: number[], bottomY: number): string {
  if (xs.length === 0 || ys.length === 0 || xs.length !== ys.length) return "";
  let d = `M ${xs[0]},${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    d += ` L ${xs[i]},${ys[i]}`;
  }
  d += ` L ${xs[xs.length - 1]},${bottomY} L ${xs[0]},${bottomY} Z`;
  return d;
}

export function DashboardTrendChart({
  granularity,
  series: seriesRaw,
  loading = false,
  rangeLabel,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "") || "trend";
  const fillScansId = `trendFillScans-${uid}`;
  const fillReviewsId = `trendFillReviews-${uid}`;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series = useMemo(() => parseSeries(seriesRaw), [seriesRaw]);

  const maxY = useMemo(() => {
    let m = 1;
    for (const p of series) {
      m = Math.max(m, p.scans, p.reviews);
    }
    return m;
  }, [series]);

  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = VIEW_H - PAD_T - PAD_B;
  const bottomY = PAD_T + innerH;

  const geom = useMemo(() => {
    const n = series.length;
    if (n === 0) {
      return {
        xs: [] as number[],
        yScans: [] as number[],
        yReviews: [] as number[],
        lineScans: "",
        lineReviews: "",
        areaScans: "",
        areaReviews: "",
        slotW: innerW,
      };
    }
    const xs: number[] = [];
    const yScans: number[] = [];
    const yReviews: number[] = [];
    const denom = Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      const x =
        n === 1
          ? PAD_L + innerW / 2
          : PAD_L + (innerW * i) / denom;
      xs.push(x);
      yScans.push(
        bottomY - (series[i]!.scans / maxY) * innerH,
      );
      yReviews.push(
        bottomY - (series[i]!.reviews / maxY) * innerH,
      );
    }
    const slotW =
      n <= 1 ? innerW : innerW / denom;
    return {
      xs,
      yScans,
      yReviews,
      lineScans: buildLinePath(xs, yScans),
      lineReviews: buildLinePath(xs, yReviews),
      areaScans: buildAreaPath(xs, yScans, bottomY),
      areaReviews: buildAreaPath(xs, yReviews, bottomY),
      slotW,
    };
  }, [series, maxY, innerW, innerH, bottomY]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [0, 0.25, 0.5, 0.75, 1];
    return ticks.map((t) => ({
      t,
      y: PAD_T + innerH * (1 - t),
      label:
        t === 0
          ? "0"
          : String(Math.round(maxY * t)),
    }));
  }, [innerH, maxY]);

  const hasAnyActivity = useMemo(
    () => series.some((p) => p.scans > 0 || p.reviews > 0),
    [series],
  );

  const onLeave = useCallback(() => setHoverIdx(null), []);

  const activeIdx =
    hoverIdx != null && hoverIdx >= 0 && hoverIdx < series.length
      ? hoverIdx
      : null;

  const tooltipLeftPct =
    activeIdx != null && geom.xs[activeIdx] != null
      ? Math.min(94, Math.max(6, (geom.xs[activeIdx]! / VIEW_W) * 100))
      : 50;

  if (loading) {
    return (
      <div
        className="h-[280px] w-full min-w-0 animate-pulse rounded-xl border border-zinc-200/80 bg-gradient-to-b from-zinc-100/90 to-zinc-50/40 dark:border-zinc-800 dark:from-zinc-900/80 dark:to-zinc-950/40"
        aria-hidden
      />
    );
  }

  if (series.length === 0) {
    return (
      <div className="flex h-[280px] w-full min-w-0 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
        No timeline data for this period ({rangeLabel}).
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-w-0 overflow-x-hidden overflow-y-visible"
      onMouseLeave={onLeave}
    >
      {!hasAnyActivity ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
          <p className="rounded-full border border-zinc-200/90 bg-white/95 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-300">
            No scans or reviews in this period · {rangeLabel}
          </p>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-center gap-6 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-8 rounded-full bg-indigo-500 dark:bg-indigo-400"
            aria-hidden
          />
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            QR scans
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-8 rounded-full bg-emerald-500 dark:bg-emerald-400"
            aria-hidden
          />
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            Reviews
          </span>
        </div>
      </div>

      <div className="relative w-full max-w-full">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full max-w-full touch-manipulation [contain:paint]"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Scans and reviews over ${rangeLabel}`}
        >
          <defs>
            <linearGradient
              id={fillScansId}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="rgb(99 102 241 / 0.2)" />
              <stop offset="100%" stopColor="rgb(99 102 241 / 0)" />
            </linearGradient>
            <linearGradient
              id={fillReviewsId}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="rgb(16 185 129 / 0.18)" />
              <stop offset="100%" stopColor="rgb(16 185 129 / 0)" />
            </linearGradient>
          </defs>

          {yTicks.map(({ t, y, label }) => (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={VIEW_W - PAD_R}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800"
                strokeDasharray="4 6"
                strokeWidth={t === 0 ? 1.25 : 1}
              />
              <text
                x={PAD_L - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-400 text-[10px] font-medium"
              >
                {label}
              </text>
            </g>
          ))}

          {hasAnyActivity && geom.areaReviews ? (
            <path
              d={geom.areaReviews}
              fill={`url(#${fillReviewsId})`}
              className="transition-opacity duration-500"
              style={{ opacity: 0.88 }}
            />
          ) : null}

          {hasAnyActivity && geom.areaScans ? (
            <path
              d={geom.areaScans}
              fill={`url(#${fillScansId})`}
              className="transition-opacity duration-500"
              style={{ opacity: 0.95 }}
            />
          ) : null}

          {hasAnyActivity && geom.lineScans ? (
            <path
              d={geom.lineScans}
              fill="none"
              stroke="rgb(79 70 229)"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-indigo-400"
              style={{
                opacity: 0,
                animation: "trendLineIn 0.65s ease-out forwards",
              }}
            />
          ) : null}
          {hasAnyActivity && geom.lineReviews ? (
            <path
              d={geom.lineReviews}
              fill="none"
              stroke="rgb(16 185 129)"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-emerald-400"
              style={{
                opacity: 0,
                animation: "trendLineIn 0.65s ease-out 0.08s forwards",
              }}
            />
          ) : null}

          <style>{`
            @keyframes trendLineIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>

          {series.map((p, i) => {
            const showTick =
              granularity === "hour"
                ? i % 4 === 0 || i === series.length - 1
                : series.length <= 14
                  ? true
                  : i % 2 === 0 || i === series.length - 1;
            if (!showTick) return null;
            const x = geom.xs[i];
            if (x == null) return null;
            return (
              <text
                key={`tick-${p.bucketStart}-${i}`}
                x={x}
                y={VIEW_H - 10}
                textAnchor="middle"
                className="fill-zinc-400 text-[9px] font-medium"
              >
                {formatAxisTick(p.bucketStart, granularity)}
              </text>
            );
          })}

          {geom.xs.map((x, i) => (
            <rect
              key={`hit-${i}`}
              x={x - geom.slotW / 2}
              y={PAD_T}
              width={geom.slotW}
              height={innerH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIdx(i)}
              onFocus={() => setHoverIdx(i)}
              onBlur={onLeave}
              tabIndex={-1}
            />
          ))}
        </svg>

        {activeIdx != null && series[activeIdx] && geom.xs[activeIdx] != null ? (
          <div
            className="pointer-events-none absolute z-30 min-w-[180px] max-w-[min(calc(100%-16px),280px)] rounded-lg border border-zinc-200/90 bg-white/98 px-3 py-2.5 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/98 dark:ring-white/10"
            style={{
              left: `${tooltipLeftPct}%`,
              top: 8,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatTooltipDate(
                series[activeIdx]!.bucketStart,
                granularity,
              )}
            </p>
            <p className="mt-1.5 flex items-center justify-between gap-4 text-zinc-600 dark:text-zinc-300">
              <span className="text-indigo-600 dark:text-indigo-400">
                Scans
              </span>
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {series[activeIdx]!.scans}
              </span>
            </p>
            <p className="mt-0.5 flex items-center justify-between gap-4 text-zinc-600 dark:text-zinc-300">
              <span className="text-emerald-600 dark:text-emerald-400">
                Reviews
              </span>
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {series[activeIdx]!.reviews}
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
