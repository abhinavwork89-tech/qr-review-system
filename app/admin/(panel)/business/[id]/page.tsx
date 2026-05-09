import { notFound } from "next/navigation";
import { BusinessDetailEditor } from "@/components/admin/business/business-detail-editor";
import { createServiceRoleClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BusinessDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  const row = data as Record<string, unknown>;
  const channels = asObject(row.channels);
  const rewardConfig = asStringArray(channels.reward_config).join("\n");

  return (
    <BusinessDetailEditor
      initial={{
        id: String(row.id ?? trimmed),
        name: asString(row.name),
        email: asString(row.email),
        mobile: asString(row.mobile),
        brandName: asString(row.brand_name) || asString(row.name),
        slug: asString(row.slug),
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
        channels: {
          instagram: readChannel(channels.instagram),
          whatsapp: readChannel(channels.whatsapp),
          facebook: readChannel(channels.facebook),
          website: readChannel(channels.website),
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

