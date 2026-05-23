import type { CSSProperties } from "react";
import type { BannerSlide } from "@/components/banner-slider";
import { resolveBusinessTheme } from "@/lib/review-theme";
import type {
  ActiveBusiness,
  BusinessChannels,
  BusinessChannelLink,
} from "@/lib/types/business";
import { mergeWhatsAppUrlIntoChannels } from "@/lib/whatsapp/wa-me";
import { buildPublicReviewQrUrl } from "@/lib/qr/qr-urls";
import { scanTrackingPublicOrigin } from "@/lib/scan/build-tracked-out-url";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import {
  buildMasterQrAbsoluteUrl,
  formatMasterQrTargetLabel,
  resolveMasterQrTargetDestination,
  resolveStoredMasterQrTarget,
  type MasterQrTarget,
} from "@/lib/scan/master-qr-target";
import { buildCallTelHref } from "@/lib/call/call-channel";
import { parsePublicResourceUrls } from "@/lib/review/parse-resource-urls";
import { normalizeReviewLocale } from "@/lib/i18n/review-locale";
import {
  computeDefaultMasterQrType,
  masterScanDestinationsMatch,
  normalizeMasterQrType,
  type MasterQrType,
} from "@/lib/scan/master-qr";
import type { AiReviewLanguage } from "@/lib/ai/constants";
import { computePublicAiReviewGenerationEnabled } from "@/lib/ai/compute-public-ai-review-enabled";
import type { GlobalAISettings } from "@/lib/ai/global-settings";
import {
  effectiveBusinessSuggestionsCount,
  getBusinessAISettings,
} from "@/lib/ai/business-settings";
import { normalizeAiReviewLanguage } from "@/lib/ai/language";

export type ReviewDisplayModel = {
  /** Supabase `businesses.id` for POST /api/review */
  businessId: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  foregroundColor: string;
  banners: BannerSlide[];
  language: string;
  googleReviewUrl: string;
  threshold: number;
  directRedirect: boolean;
  allowLowRatingRedirect: boolean;
  customerCareNumber: string | null;
  /** Tracked `tel:` href from Call channel when enabled + valid; takes precedence over legacy customer care. */
  callTelHref: string | null;
  spinEnabled: boolean;
  scratchEnabled: boolean;
  rewardConfig: string[];
  channels: BusinessChannels | null;
  /** Sanitized public HTTP(S) URLs for digital resources (images, PDFs, etc.). */
  resourceUrls: string[];
  /** @deprecated Legacy master type key; prefer `masterQrTarget`. */
  masterQrType: MasterQrType;
  /** @deprecated Use `masterQrUrl`. Permanent `/m/{businessId}` payload (never scan/out). */
  masterQrTrackUrl: string;
  /** Configured master QR runtime target. */
  masterQrTarget: MasterQrTarget;
  masterQrTargetLabel: string;
  /** Permanent master QR payload: `{origin}/m/{businessId}`. */
  masterQrUrl: string;
  /** Fixed public review QR: `{origin}/r/{slug}`. */
  publicReviewQrUrl: string;
  /**
   * When true, `/r/[slug]` redirects directly to the resolved master target destination
   * (no `/api/scan/out` on the review page load).
   */
  directOutboundFromReviewPage: boolean;
  /** Resolved master target destination URL (direct redirect, not tracked). */
  masterOutboundUrl: string;
  /** When true, public review page may call POST /api/ai/generate-review (server-gated). */
  aiReviewGenerationEnabled: boolean;
  /** Expected AI suggestion count (plan + optional business override); matches POST /api/ai/generate-review. */
  aiSuggestionCount: number;
  /** Language sent to the AI API (`en` | `hi` | `hinglish`) from business AI settings. */
  aiGenerateLanguage: AiReviewLanguage;
};

export type ActiveBusinessDisplayOptions = {
  /** Request host origin for SSR (see `getServerRequestPublicOrigin`). */
  publicOrigin?: string | null;
  /** Global AI settings from `app_settings` (SSR); used with business `ai_enabled`. */
  globalAi?: GlobalAISettings | null;
};

function emptyChannel(): BusinessChannelLink {
  return { enabled: false, url: "" };
}

function parseChannelRecord(raw: unknown): BusinessChannelLink {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return emptyChannel();
  }
  const r = raw as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : false,
    url: typeof r.url === "string" ? r.url : "",
    primary: r.primary === true,
  };
}

function parseXFromChannels(o: Record<string, unknown>): BusinessChannelLink {
  const x = o.x;
  if (typeof x === "object" && x !== null && !Array.isArray(x)) {
    return parseChannelRecord(x);
  }
  const legacyTwitter = o.twitter;
  if (
    typeof legacyTwitter === "object" &&
    legacyTwitter !== null &&
    !Array.isArray(legacyTwitter)
  ) {
    return parseChannelRecord(legacyTwitter);
  }
  return emptyChannel();
}

function parseChannels(raw: unknown): BusinessChannels | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const primaryRaw =
    typeof o.primary === "string" ? o.primary.trim().toLowerCase() : "";
  const normalizedPrimary = primaryRaw === "twitter" ? "x" : primaryRaw;
  const primary = ["instagram", "whatsapp", "facebook", "youtube", "website", "x"].includes(
    normalizedPrimary,
  )
    ? (normalizedPrimary as BusinessChannels["primary"])
    : undefined;

  const link = (key: string): BusinessChannelLink => parseChannelRecord(o[key]);

  return {
    primary,
    spin_enabled: o.spin_enabled === true,
    scratch_enabled: o.scratch_enabled === true,
    reward_config: parseRewardConfig(o.reward_config),
    instagram: link("instagram"),
    whatsapp: link("whatsapp"),
    facebook: link("facebook"),
    youtube: link("youtube"),
    website: link("website"),
    x: parseXFromChannels(o),
  };
}

function parseBannerUrls(raw: unknown): BannerSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map((src, i) => ({
      src: src.trim(),
      /** No per-banner link in schema; slider uses non-navigating anchor. */
      href: "#",
      alt: `Promotion ${i + 1}`,
    }));
}

function parseRewardConfig(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function normalizeThreshold(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.round(value);
    if (n >= 1 && n <= 5) return n;
  }
  return 4;
}

export type MasterQrScanFieldsInput = {
  id: string;
  slug: string;
  google_url: string | null | undefined;
  channels: unknown;
  whatsapp_country_code?: string | null;
  whatsapp_number?: string | null;
  master_qr_type?: string | null;
};

/** @deprecated Prefer `activeBusinessToDisplay` fields; kept for legacy callers. */
export function computeMasterQrScanFields(
  input: MasterQrScanFieldsInput & { master_qr_target?: string | null; resource_urls?: unknown },
  origin: string,
): {
  effectiveMasterType: MasterQrType;
  masterOutboundUrl: string;
  /** Permanent `/m/{businessId}` payload URL. */
  masterQrTrackUrl: string;
  reviewPageUrl: string;
} {
  const o = origin.trim().replace(/\/+$/, "");
  const targetCtx = {
    master_qr_target: input.master_qr_target ?? null,
    master_qr_type: input.master_qr_type ?? null,
    slug: input.slug,
    google_url: input.google_url,
    channels: input.channels,
    whatsapp_country_code: input.whatsapp_country_code,
    whatsapp_number: input.whatsapp_number,
    resource_urls: input.resource_urls,
  };
  const reviewBase = buildPublicReviewQrUrl(o, input.slug);
  const masterOutbound =
    resolveMasterQrTargetDestination(targetCtx, o) ?? reviewBase;
  const effectiveMasterType =
    normalizeMasterQrType(input.master_qr_type) ??
    computeDefaultMasterQrType({
      google_url: input.google_url,
      channels: input.channels,
      whatsapp_country_code: input.whatsapp_country_code,
      whatsapp_number: input.whatsapp_number,
    });
  return {
    effectiveMasterType,
    masterOutboundUrl: masterOutbound,
    masterQrTrackUrl: buildMasterQrAbsoluteUrl(o, input.id),
    reviewPageUrl: reviewBase,
  };
}

export function activeBusinessToDisplay(
  business: ActiveBusiness,
  options?: ActiveBusinessDisplayOptions,
): ReviewDisplayModel {
  const origin =
    options?.publicOrigin?.trim().replace(/\/+$/, "") || scanTrackingPublicOrigin();
  const t = resolveBusinessTheme(business);
  const parsedChannels = parseChannels(business.channels);
  const channelsForDisplay =
    parsedChannels &&
    mergeWhatsAppUrlIntoChannels(
      parsedChannels,
      business.whatsapp_country_code,
      business.whatsapp_number,
    );
  const targetCtx = {
    master_qr_target:
      typeof business.master_qr_target === "string" ? business.master_qr_target : null,
    master_qr_type: business.master_qr_type,
    slug: business.slug,
    google_url: business.google_url,
    channels: business.channels,
    whatsapp_country_code: business.whatsapp_country_code,
    whatsapp_number: business.whatsapp_number,
    resource_urls: business.resource_urls,
  };
  const masterQrTarget = resolveStoredMasterQrTarget(targetCtx);
  const reviewBase = buildPublicReviewQrUrl(origin, business.slug);
  const masterQrUrl = buildMasterQrAbsoluteUrl(origin, business.id);
  const masterOutbound =
    resolveMasterQrTargetDestination(targetCtx, origin) ?? reviewBase;
  const directOutboundFromReviewPage =
    business.direct_redirect === true &&
    isSafeHttpUrl(masterOutbound) &&
    !masterScanDestinationsMatch(masterOutbound, reviewBase);
  const effectiveMasterType =
    normalizeMasterQrType(business.master_qr_type) ??
    computeDefaultMasterQrType({
      google_url: business.google_url,
      channels: business.channels,
      whatsapp_country_code: business.whatsapp_country_code,
      whatsapp_number: business.whatsapp_number,
    });
  const brandName =
    business.brand_name?.trim() || business.name?.trim() || "Business";
  const googleReviewUrl = business.google_url?.trim() ?? "";
  const aiGenerateLanguage = normalizeAiReviewLanguage(
    business.ai_review_language ?? business.language,
  );
  const aiSuggestionCount = effectiveBusinessSuggestionsCount(business);
  return {
    businessId: business.id,
    brandName,
    logoUrl: business.logo_url,
    primaryColor: t.primary,
    secondaryColor: t.secondary,
    backgroundColor: t.background,
    foregroundColor: t.foreground,
    banners: parseBannerUrls(business.banner_urls),
    language: normalizeReviewLocale(business.language ?? "en"),
    googleReviewUrl,
    threshold: normalizeThreshold(business.threshold),
    directRedirect: business.direct_redirect === true,
    allowLowRatingRedirect: business.allow_low_rating_redirect === true,
    customerCareNumber: business.customer_care_number?.trim() || null,
    callTelHref: buildCallTelHref(
      business.call_enabled === true,
      business.call_country_code,
      business.call_number,
    ),
    spinEnabled: channelsForDisplay?.spin_enabled === true,
    scratchEnabled: channelsForDisplay?.scratch_enabled === true,
    rewardConfig: channelsForDisplay?.reward_config ?? [],
    channels: channelsForDisplay,
    masterQrType: effectiveMasterType,
    masterQrTarget,
    masterQrTargetLabel: formatMasterQrTargetLabel(masterQrTarget),
    masterQrUrl,
    masterQrTrackUrl: masterQrUrl,
    publicReviewQrUrl: reviewBase,
    directOutboundFromReviewPage,
    masterOutboundUrl: masterOutbound,
    resourceUrls: parsePublicResourceUrls(business.resource_urls),
    aiReviewGenerationEnabled: computePublicAiReviewGenerationEnabled(
      options?.globalAi ?? null,
      getBusinessAISettings(business).ai_enabled,
    ),
    aiSuggestionCount,
    aiGenerateLanguage,
  };
}

export function reviewDisplayToCssVars(d: ReviewDisplayModel): CSSProperties {
  return {
    "--review-primary": d.primaryColor,
    "--review-secondary": d.secondaryColor,
    "--review-bg": d.backgroundColor,
    "--review-fg": d.foregroundColor,
    "--review-muted": "color-mix(in srgb, var(--review-fg) 62%, transparent)",
  } as CSSProperties;
}
