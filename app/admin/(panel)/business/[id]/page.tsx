import { notFound } from "next/navigation";
import { BusinessDetailEditor } from "@/components/admin/business/business-detail-editor";
import { normalizeBusinessStatus } from "@/lib/business/status";
import { mergeBusinessTypeCatalogWithInUseSlugs } from "@/lib/admin/business-type-display";
import { listBusinessTypeSelectOptions } from "@/lib/data/business-types-admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BusinessDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const modeRaw = query.mode;
  const mode = Array.isArray(modeRaw) ? modeRaw[0] ?? "" : modeRaw ?? "";
  const trimmed = id.trim();
  if (!trimmed) notFound();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", trimmed)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("id,rating,review_text,name,created_at")
    .eq("business_id", trimmed)
    .order("created_at", { ascending: false })
    .limit(50);

  const reviews = ((reviewsData ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ""),
    rating:
      typeof row.rating === "number"
        ? row.rating
        : Number.parseFloat(String(row.rating ?? "0")) || 0,
    review_text: asString(row.review_text),
    name: asString(row.name),
    created_at: asString(row.created_at),
  }));
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, item) => sum + (Number.isFinite(item.rating) ? item.rating : 0), 0) /
        totalReviews
      : 0;

  const row = data as Record<string, unknown>;
  const channels = asObject(row.channels);
  const rewardConfig = asStringArray(channels.reward_config).join("\n");
  const currentBusinessType = asString(row.business_type);
  const { options: catalogTypeOptions } = await listBusinessTypeSelectOptions();
  const businessTypeOptions = mergeBusinessTypeCatalogWithInUseSlugs(
    catalogTypeOptions,
    currentBusinessType ? [currentBusinessType] : [],
  );

  return (
    <BusinessDetailEditor
      businessTypeOptions={businessTypeOptions}
      initialEditing={mode === "edit"}
      analytics={{
        totalReviews,
        averageRating,
        reviews,
      }}
      initial={{
        id: String(row.id ?? trimmed),
        name: asString(row.name),
        email: asString(row.email),
        mobile: asString(row.mobile),
        brandName: asString(row.brand_name) || asString(row.name),
        slug: asString(row.slug),
        businessType: asString(row.business_type),
        planType: asString(row.plan_type),
        language: asString(row.language) || "en",
        primaryColor: asString(row.primary_color) || "#4f46e5",
        secondaryColor: asString(row.secondary_color) || "#64748b",
        googleUrl: asString(row.google_url),
        threshold: String(row.threshold ?? "4"),
        directRedirect: asBoolean(row.direct_redirect),
        allowLowRatingRedirect: asBoolean(row.allow_low_rating_redirect),
        spinEnabled: asBoolean(channels.spin_enabled),
        scratchEnabled: asBoolean(channels.scratch_enabled),
        rewardConfigText: rewardConfig,
        logoUrl: asString(row.logo_url),
        banners: asStringArray(row.banner_urls),
        resources: asStringArray(row.resource_urls),
        status: normalizeBusinessStatus(row),
        channels: {
          instagram: readChannel(channels.instagram),
          whatsapp: readChannel(channels.whatsapp),
          facebook: readChannel(channels.facebook),
          website: readChannel(channels.website),
          x: readChannel(
            channels.x !== undefined && channels.x !== null
              ? channels.x
              : channels.twitter,
          ),
        },
      }}
    />
  );
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asBoolean(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === "string");
}

function asObject(v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

function readChannel(v: unknown): { enabled: boolean; url: string } {
  const c = asObject(v);
  return {
    enabled: asBoolean(c.enabled),
    url: asString(c.url),
  };
}

