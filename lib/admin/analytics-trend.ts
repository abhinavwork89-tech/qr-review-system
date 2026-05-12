/**
 * Build UTC-bucketed time series for admin dashboard trend chart.
 * Buckets: hourly for "today" (days=1), daily for 7 and 30 day ranges.
 */

export type TrendGranularity = "hour" | "day";

export type TrendSeriesPoint = {
  /** ISO timestamp for bucket start (UTC) */
  bucketStart: string;
  scans: number;
  reviews: number;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function utcDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Parse ISO to Date; invalid → null */
function safeDate(iso: unknown): Date | null {
  if (typeof iso !== "string" || !iso.trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hourBucketStartUtc(d: Date): string {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  x.setUTCSeconds(0, 0);
  x.setUTCMilliseconds(0);
  return x.toISOString();
}

function dayBucketStartUtcFromKey(dayKey: string): string {
  const parts = dayKey.split("-").map((x) => Number(x));
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  if (!y || !m || !d) return new Date(0).toISOString();
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

function buildHourlyBucketsToday(): string[] {
  const keys: string[] = [];
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  for (let h = 0; h < 24; h++) {
    const slot = new Date(base);
    slot.setUTCHours(h, 0, 0, 0);
    keys.push(slot.toISOString());
  }
  return keys;
}

function buildDailyBuckets(dayCount: 7 | 30): string[] {
  const keys: string[] = [];
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(utcDayKey(d));
  }
  return keys;
}

export function buildAnalyticsTrendSeries(params: {
  days: 1 | 7 | 30;
  scans: Array<{ created_at?: unknown }>;
  reviews: Array<{ created_at?: unknown }>;
}): { granularity: TrendGranularity; series: TrendSeriesPoint[] } {
  const { days, scans, reviews } = params;

  const granularity: TrendGranularity = days === 1 ? "hour" : "day";
  const bucketKeys =
    days === 1 ? buildHourlyBucketsToday() : buildDailyBuckets(days);

  const scanCounts = new Map<string, number>();
  const reviewCounts = new Map<string, number>();

  for (const k of bucketKeys) {
    scanCounts.set(k, 0);
    reviewCounts.set(k, 0);
  }

  const scanKeyFn =
    granularity === "hour"
      ? (d: Date) => hourBucketStartUtc(d)
      : (d: Date) => utcDayKey(d);

  for (const row of scans) {
    const d = safeDate(row.created_at);
    if (!d) continue;
    const key = scanKeyFn(d);
    if (!scanCounts.has(key)) continue;
    scanCounts.set(key, (scanCounts.get(key) ?? 0) + 1);
  }

  for (const row of reviews) {
    const d = safeDate(row.created_at);
    if (!d) continue;
    const key = scanKeyFn(d);
    if (!reviewCounts.has(key)) continue;
    reviewCounts.set(key, (reviewCounts.get(key) ?? 0) + 1);
  }

  const series: TrendSeriesPoint[] = bucketKeys.map((key) => ({
    bucketStart:
      granularity === "hour" ? key : dayBucketStartUtcFromKey(key),
    scans: scanCounts.get(key) ?? 0,
    reviews: reviewCounts.get(key) ?? 0,
  }));

  return { granularity, series };
}
