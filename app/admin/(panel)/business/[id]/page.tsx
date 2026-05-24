import { notFound } from "next/navigation";
import { BusinessDetailEditor } from "@/components/admin/business/business-detail-editor";
import { normalizeBusinessStatus } from "@/lib/business/status";
import {
  isAllowedIdentityTypeSlug,
  parseIdentityTypeInput,
} from "@/lib/business/identity";
import { mergeBusinessTypeCatalogWithInUseSlugs } from "@/lib/admin/business-type-display";
import { listBusinessTypeSelectOptions } from "@/lib/data/business-types-admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DEFAULT_DIAL_CODE, normalizeDialCode } from "@/lib/phone/mobile";
import { clampWhatsAppLocalInput, tryInferWhatsAppPartsFromLegacyUrl } from "@/lib/whatsapp/wa-me";
import { clampCallLocalInput } from "@/lib/call/call-channel";
import {
  computeDefaultMasterQrType,
  normalizeMasterQrType,
  type MasterQrType,
} from "@/lib/scan/master-qr";
import { resolveStoredMasterQrTarget, type MasterQrTarget } from "@/lib/scan/master-qr-target";

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
  const waChannel = readChannel(channels.whatsapp);
  const storedWaCc =
    typeof row.whatsapp_country_code === "string" ? row.whatsapp_country_code.trim() : "";
  const storedWaNum =
    typeof row.whatsapp_number === "string"
      ? clampWhatsAppLocalInput(row.whatsapp_number)
      : "";
  const inferredWa =
    !storedWaCc && !storedWaNum && waChannel.url.trim()
      ? tryInferWhatsAppPartsFromLegacyUrl(waChannel.url)
      : null;
  const masterBaseForQr = {
    google_url: asString(row.google_url) || null,
    channels,
    whatsapp_country_code: waChannel.enabled
      ? (inferredWa?.dialCode || storedWaCc || DEFAULT_DIAL_CODE)
      : null,
    whatsapp_number: waChannel.enabled
      ? clampWhatsAppLocalInput(inferredWa?.localNumber || storedWaNum || "")
      : null,
  };
  const masterQrType: MasterQrType =
    normalizeMasterQrType(
      typeof row.master_qr_type === "string" ? row.master_qr_type : null,
    ) ?? computeDefaultMasterQrType(masterBaseForQr);
  const masterQrTarget: MasterQrTarget = resolveStoredMasterQrTarget({
    master_qr_target:
      typeof row.master_qr_target === "string" ? row.master_qr_target : null,
    master_qr_type: typeof row.master_qr_type === "string" ? row.master_qr_type : null,
    slug: asString(row.slug),
    ...masterBaseForQr,
    resource_urls: asStringArray(row.resource_urls),
  });
  const identityTypeSlug = parseIdentityTypeInput(
    typeof row.identity_type === "string" ? row.identity_type : "",
  );
  const identityTypeInitial = isAllowedIdentityTypeSlug(identityTypeSlug)
    ? identityTypeSlug
    : "aadhaar";
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
          youtube: readChannel(channels.youtube),
          website: readChannel(channels.website),
          x: readChannel(
            channels.x !== undefined && channels.x !== null
              ? channels.x
              : channels.twitter,
          ),
        },
        whatsappCountryCode: inferredWa?.dialCode || storedWaCc || DEFAULT_DIAL_CODE,
        whatsappNumber: clampWhatsAppLocalInput(inferredWa?.localNumber || storedWaNum || ""),
        callEnabled: row.call_enabled === true,
        callCountryCode: normalizeDialCode(
          (() => {
            const raw =
              typeof row.call_country_code === "string" ? row.call_country_code.trim() : "";
            const d = raw.replace(/\D/g, "");
            return d ? `+${d}` : "+91";
          })(),
        ),
        callNumber: clampCallLocalInput(
          typeof row.call_number === "string" ? row.call_number : "",
        ),
        masterQrType,
        masterQrTarget,
        identityType:
          typeof row.identity_type === "string" && row.identity_type.trim()
            ? identityTypeInitial
            : "aadhaar",
        identityNumber:
          typeof row.identity_number === "string" ? row.identity_number.trim() : "",
        identityProofUrls: asIdentityProofUrls(row.identity_proof_urls),
        clientPhotoUrl:
          typeof row.client_photo_url === "string" ? row.client_photo_url.trim() : "",
        aiEnabled: row.ai_enabled === true,
        aiReviewLanguage:
          typeof row.ai_review_language === "string" &&
          ["en", "hi", "hinglish"].includes(row.ai_review_language.trim().toLowerCase())
            ? (row.ai_review_language.trim().toLowerCase() as "en" | "hi" | "hinglish")
            : "en",
        aiDailyLimit: String(
          typeof row.ai_daily_limit === "number" && Number.isFinite(row.ai_daily_limit)
            ? row.ai_daily_limit
            : 50,
        ),
        aiSuggestionsCount:
          row.ai_suggestions_count != null && typeof row.ai_suggestions_count === "number"
            ? String(row.ai_suggestions_count)
            : "",
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

function asIdentityProofUrls(v: unknown): string[] {
  return asStringArray(v)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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

