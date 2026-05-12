import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildAnalyticsTrendSeries } from "@/lib/admin/analytics-trend";
import { normalizeBusinessStatus } from "@/lib/business/status";
import { requireAdminSession } from "@/lib/require-admin-session";

export type AnalyticsRangeDays = 1 | 7 | 30;

function parseDays(raw: string | null): AnalyticsRangeDays {
  if (raw === "1") return 1;
  if (raw === "7") return 7;
  return 30;
}

/** Start of UTC window aligned with trend buckets (today | last N calendar days). */
function rangeStartIso(days: AnalyticsRangeDays): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  if (days === 1) {
    return d.toISOString();
  }
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString();
}

export async function GET(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;

  try {
    const url = new URL(request.url);
    const days = parseDays(url.searchParams.get("days"));
    const since = rangeStartIso(days);

    const supabase = createServiceRoleClient();

    const [{ data: scans, error: scanErr }, { data: reviews, error: revErr }] =
      await Promise.all([
        supabase
          .from("scan_logs")
          .select("id, business_id, qr_type, referrer, device, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("id, business_id, rating, name, review_text, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
      ]);

    if (scanErr) {
      return NextResponse.json({ error: scanErr.message }, { status: 500 });
    }
    if (revErr) {
      return NextResponse.json({ error: revErr.message }, { status: 500 });
    }

    const scanList = scans ?? [];
    const reviewList = reviews ?? [];

    const totalScans = scanList.length;
    const totalReviews = reviewList.length;

    let sumRating = 0;
    for (const r of reviewList) {
      const n = typeof r.rating === "number" ? r.rating : 0;
      sumRating += n;
    }
    const averageRating =
      totalReviews > 0 ? Math.round((sumRating / totalReviews) * 100) / 100 : null;

    const conversionRate =
      totalScans > 0 ? Math.round((totalReviews / totalScans) * 10_000) / 100 : 0;

    const scansByQrType: Record<string, number> = {};
    for (const s of scanList) {
      const k =
        typeof s.qr_type === "string" && s.qr_type.trim()
          ? s.qr_type.trim()
          : "unknown";
      scansByQrType[k] = (scansByQrType[k] ?? 0) + 1;
    }

    const scanByBusiness = new Map<string, number>();
    for (const s of scanList) {
      const id = typeof s.business_id === "string" ? s.business_id : "";
      if (!id) continue;
      scanByBusiness.set(id, (scanByBusiness.get(id) ?? 0) + 1);
    }

    const reviewByBusiness = new Map<string, number>();
    for (const r of reviewList) {
      const id = typeof r.business_id === "string" ? r.business_id : "";
      if (!id) continue;
      reviewByBusiness.set(id, (reviewByBusiness.get(id) ?? 0) + 1);
    }

    const statIds = new Set<string>([
      ...scanByBusiness.keys(),
      ...reviewByBusiness.keys(),
    ]);

    const { data: businessesRaw, error: bizErr } = await supabase
      .from("businesses")
      .select("id, brand_name, name, status, is_active");

    if (bizErr) {
      return NextResponse.json({ error: bizErr.message }, { status: 500 });
    }

    const businessRows = businessesRaw ?? [];
    const visible = businessRows.filter((row) => {
      const status = normalizeBusinessStatus(row as Record<string, unknown>);
      return status !== "deleted";
    });

    const labelById = new Map<string, string>();
    for (const row of visible) {
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : "";
      if (!id) continue;
      const brand =
        typeof r.brand_name === "string" ? r.brand_name.trim() : "";
      const name = typeof r.name === "string" ? r.name.trim() : "";
      labelById.set(id, brand || name || "Business");
    }

    const visibleIds = new Set(visible.map((row) => (row as { id: string }).id));

    const businessStats = visible
      .map((row) => {
        const id = (row as { id: string }).id;
        return {
          id,
          name: labelById.get(id) ?? "Business",
          scans: scanByBusiness.get(id) ?? 0,
          reviews: reviewByBusiness.get(id) ?? 0,
        };
      })
      .filter((b) => visibleIds.has(b.id))
      .sort(
        (a, b) =>
          b.scans - a.scans ||
          b.reviews - a.reviews ||
          a.name.localeCompare(b.name),
      );

    const recentSlice = scanList.slice(0, 12);
    const recentReviewsSlice = reviewList.slice(0, 12);

    const recentScans = recentSlice.map((s) => {
      const bid = typeof s.business_id === "string" ? s.business_id : "";
      return {
        id: typeof s.id === "string" ? s.id : "",
        business_id: bid,
        businessLabel: labelById.get(bid) ?? "—",
        qr_type: typeof s.qr_type === "string" ? s.qr_type : null,
        created_at: typeof s.created_at === "string" ? s.created_at : "",
        referrer: typeof s.referrer === "string" ? s.referrer : null,
      };
    });

    const recentReviews = recentReviewsSlice.map((r) => {
      const bid = typeof r.business_id === "string" ? r.business_id : "";
      return {
        id: typeof r.id === "string" ? r.id : "",
        business_id: bid,
        businessLabel: labelById.get(bid) ?? "—",
        rating: typeof r.rating === "number" ? r.rating : 0,
        name: typeof r.name === "string" ? r.name : "",
        review_text: typeof r.review_text === "string" ? r.review_text : "",
        created_at: typeof r.created_at === "string" ? r.created_at : "",
      };
    });

    const { granularity: trendGranularity, series: trendSeries } =
      buildAnalyticsTrendSeries({
        days,
        scans: scanList,
        reviews: reviewList,
      });

    return NextResponse.json(
      {
        days,
        since,
        totalBusinesses: visible.length,
        totalScans,
        totalReviews,
        averageRating,
        conversionRate,
        scansByQrType,
        recentScans,
        recentReviews,
        businessStats,
        trendGranularity,
        trendSeries,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
