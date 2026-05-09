import {
  Building2,
  CircleDollarSign,
  MessageSquareText,
  Store,
} from "lucide-react";
import { ChartCard } from "@/components/admin/dashboard/chart-card";
import { StatsCard, type StatsCardProps } from "@/components/admin/dashboard/stats-card";
import { createServiceRoleClient } from "@/lib/supabase/server";

type BusinessBasic = {
  id: string;
  name: string;
};

type BusinessStats = {
  id: string;
  name: string;
  scans: number;
  reviews: number;
};

export default async function AdminDashboardPage() {
  const supabase = createServiceRoleClient();

  const [{ count: scanCount }, { count: reviewCount }, { count: businessCount }] =
    await Promise.all([
      supabase.from("scan_logs").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("businesses").select("*", { count: "exact", head: true }),
    ]);

  const totalScans = scanCount ?? 0;
  const totalReviews = reviewCount ?? 0;
  const totalBusinesses = businessCount ?? 0;
  const conversionRate =
    totalScans > 0 ? (totalReviews / totalScans) * 100 : 0;

  const [{ data: businessesRaw }, { data: scanRows }, { data: reviewRows }] =
    await Promise.all([
      supabase.from("businesses").select("id, brand_name, name"),
      supabase.from("scan_logs").select("business_id"),
      supabase.from("reviews").select("business_id"),
    ]);

  const businesses: BusinessBasic[] = (businessesRaw ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const brand = typeof r.brand_name === "string" ? r.brand_name.trim() : "";
    const name = typeof r.name === "string" ? r.name.trim() : "";
    return {
      id,
      name: brand || name || "Business",
    };
  });

  const scanByBusiness = new Map<string, number>();
  for (const row of scanRows ?? []) {
    const id = (row as { business_id?: unknown }).business_id;
    if (typeof id !== "string" || !id) continue;
    scanByBusiness.set(id, (scanByBusiness.get(id) ?? 0) + 1);
  }

  const reviewByBusiness = new Map<string, number>();
  for (const row of reviewRows ?? []) {
    const id = (row as { business_id?: unknown }).business_id;
    if (typeof id !== "string" || !id) continue;
    reviewByBusiness.set(id, (reviewByBusiness.get(id) ?? 0) + 1);
  }

  const businessStats: BusinessStats[] = businesses
    .map((b) => ({
      id: b.id,
      name: b.name,
      scans: scanByBusiness.get(b.id) ?? 0,
      reviews: reviewByBusiness.get(b.id) ?? 0,
    }))
    .sort((a, b) => b.scans - a.scans || b.reviews - a.reviews || a.name.localeCompare(b.name));

  const STATS: StatsCardProps[] = [
    {
      title: "Total Businesses",
      value: formatNumber(totalBusinesses),
      growth: "0%",
      icon: Building2,
    },
    {
      title: "Total Scans",
      value: formatNumber(totalScans),
      growth: "0%",
      icon: Store,
    },
    {
      title: "Total Reviews",
      value: formatNumber(totalReviews),
      growth: "0%",
      icon: MessageSquareText,
    },
    {
      title: "Conversion Rate",
      value: `${formatPercent(conversionRate)}%`,
      growth: "0%",
      icon: CircleDollarSign,
    },
  ];

  const HAS_CHART_DATA = businessStats.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Overview of your platform
        </p>
      </div>

      {STATS.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((item) => (
            <StatsCard key={item.title} {...item} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white text-sm font-medium text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No data yet
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Last 30 Days"
            subtitle="Trend of review activity"
            hasData={HAS_CHART_DATA}
          >
            <div className="h-64 rounded-xl border border-zinc-200/80 bg-gradient-to-b from-indigo-50/40 to-white p-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900">
              <div className="relative h-full w-full">
                <div className="absolute inset-0 grid grid-rows-4 gap-4">
                  {[0, 1, 2, 3].map((row) => (
                    <div
                      key={row}
                      className="border-b border-dashed border-zinc-200 dark:border-zinc-800"
                    />
                  ))}
                </div>
                <svg
                  viewBox="0 0 400 160"
                  className="relative z-10 h-full w-full"
                  preserveAspectRatio="none"
                  aria-label="Line chart placeholder"
                >
                  <defs>
                    <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99 102 241 / 0.25)" />
                      <stop offset="100%" stopColor="rgb(99 102 241 / 0.02)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,122 C40,118 55,94 92,98 C120,101 150,126 180,114 C214,100 236,50 274,58 C304,64 332,93 358,88 C376,84 388,64 400,56 L400,160 L0,160 Z"
                    fill="url(#lineFill)"
                  />
                  <path
                    d="M0,122 C40,118 55,94 92,98 C120,101 150,126 180,114 C214,100 236,50 274,58 C304,64 332,93 358,88 C376,84 388,64 400,56"
                    fill="none"
                    stroke="rgb(79 70 229)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </ChartCard>
        </div>

        <ChartCard
          title="Business Types"
          subtitle="Per business scan and review totals"
          hasData={HAS_CHART_DATA}
        >
          <div className="h-64 overflow-auto rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="space-y-2">
              {businessStats.map((row) => (
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
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.max(0, value));
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}
