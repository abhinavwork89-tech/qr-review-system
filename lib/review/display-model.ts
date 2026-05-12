import type { CSSProperties } from "react";
import type { BannerSlide } from "@/components/banner-slider";
import { resolveBusinessTheme } from "@/lib/review-theme";
import type {
  ActiveBusiness,
  BusinessChannels,
  BusinessChannelLink,
} from "@/lib/types/business";
import { mergeWhatsAppUrlIntoChannels } from "@/lib/whatsapp/wa-me";
import { buildTrackedScanOutUrl, scanTrackingPublicOrigin } from "@/lib/scan/build-tracked-out-url";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { buildCallTelHref } from "@/lib/call/call-channel";
import { parsePublicResourceUrls } from "@/lib/review/parse-resource-urls";
import { normalizeReviewLocale } from "@/lib/i18n/review-locale";
import {
  computeDefaultMasterQrType,
  masterScanDestinationsMatch,
  normalizeMasterQrType,
  resolveMasterOutboundUrl,
  type MasterQrType,
} from "@/lib/scan/master-qr";

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
  /** Resolved master QR target key (stored or computed default). */
  masterQrType: MasterQrType;
  /** Tracked `/api/scan/out` URL for the master QR on the public review page. */
  masterQrTrackUrl: string;
  /**
   * When true, `/r/[slug]` should not render the public shell: redirect straight to
   * `masterQrTrackUrl` (HTTP 302 chain → destination) so scan_logs still record `master`.
   */
  directOutboundFromReviewPage: boolean;
  /** Outbound URL before `/api/scan/out` tracking (resolved master + fallbacks). */
  masterOutboundUrl: string;
};

export type ActiveBusinessDisplayOptions = {
  /** Request host origin for SSR (see `getServerRequestPublicOrigin`). */
  publicOrigin?: string | null;
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
  const primary = ["instagram", "whatsapp", "facebook", "website", "x"].includes(
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

/**
 * Master outbound + `/api/scan/out` tracking URL — same rules as the public review page.
 * Shared with welcome email so the mailed QR matches live master QR behavior.
 */
export function computeMasterQrScanFields(
  input: MasterQrScanFieldsInput,
  origin: string,
): {
  effectiveMasterType: MasterQrType;
  masterOutboundUrl: string;
  masterQrTrackUrl: string;
  reviewPageUrl: string;
} {
  const o = origin.trim().replace(/\/+$/, "");
  const parsedChannels = parseChannels(input.channels);
  const channelsForDisplay =
    parsedChannels &&
    mergeWhatsAppUrlIntoChannels(
      parsedChannels,
      input.whatsapp_country_code,
      input.whatsapp_number,
    );
  const masterChannelsUnknown: unknown =
    channelsForDisplay !== null && channelsForDisplay !== undefined
      ? channelsForDisplay
      : {};
  const masterBase = {
    google_url: input.google_url,
    channels: masterChannelsUnknown,
    whatsapp_country_code: input.whatsapp_country_code,
    whatsapp_number: input.whatsapp_number,
  };
  const effectiveMasterType =
    normalizeMasterQrType(input.master_qr_type) ?? computeDefaultMasterQrType(masterBase);
  const slugSeg = encodeURIComponent((input.slug ?? "").trim()) || "-";
  const reviewBase = `${o}/r/${slugSeg}`;
  const masterOutbound = resolveMasterOutboundUrl(
    { ...masterBase, master_qr_type: effectiveMasterType },
    reviewBase,
  );
  const masterQrTrackUrl = buildTrackedScanOutUrl(
    input.id,
    "master",
    masterOutbound,
    o,
  );
  return {
    effectiveMasterType,
    masterOutboundUrl: masterOutbound,
    masterQrTrackUrl,
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
  const scan = computeMasterQrScanFields(
    {
      id: business.id,
      slug: business.slug,
      google_url: business.google_url,
      channels: business.channels,
      whatsapp_country_code: business.whatsapp_country_code,
      whatsapp_number: business.whatsapp_number,
      master_qr_type: business.master_qr_type,
    },
    origin,
  );
  const effectiveMasterType = scan.effectiveMasterType;
  const reviewBase = scan.reviewPageUrl;
  const masterOutbound = scan.masterOutboundUrl;
  const masterQrTrackUrl = scan.masterQrTrackUrl;
  const directOutboundFromReviewPage =
    business.direct_redirect === true &&
    isSafeHttpUrl(masterOutbound) &&
    !masterScanDestinationsMatch(masterOutbound, reviewBase);
  const brandName =
    business.brand_name?.trim() || business.name?.trim() || "Business";
  const googleReviewUrl = business.google_url?.trim() ?? "";
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
    masterQrTrackUrl,
    directOutboundFromReviewPage,
    masterOutboundUrl: masterOutbound,
    resourceUrls: parsePublicResourceUrls(business.resource_urls),
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
