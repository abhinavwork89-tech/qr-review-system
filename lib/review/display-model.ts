import type { CSSProperties } from "react";
import type { BannerSlide } from "@/components/banner-slider";
import { resolveBusinessTheme } from "@/lib/review-theme";
import type {
  ActiveBusiness,
  BusinessChannels,
  BusinessChannelLink,
} from "@/lib/types/business";

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
  spinEnabled: boolean;
  scratchEnabled: boolean;
  rewardConfig: string[];
  channels: BusinessChannels | null;
};

function emptyChannel(): BusinessChannelLink {
  return { enabled: false, url: "" };
}

function parseChannels(raw: unknown): BusinessChannels | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const primary =
    typeof o.primary === "string" &&
    ["instagram", "whatsapp", "facebook", "website"].includes(
      o.primary.trim().toLowerCase(),
    )
      ? (o.primary.trim().toLowerCase() as BusinessChannels["primary"])
      : undefined;
  const link = (key: string): BusinessChannelLink => {
    const c = o[key];
    if (typeof c !== "object" || c === null || Array.isArray(c)) {
      return emptyChannel();
    }
    const r = c as Record<string, unknown>;
    return {
      enabled: typeof r.enabled === "boolean" ? r.enabled : false,
      url: typeof r.url === "string" ? r.url : "",
      primary: r.primary === true,
    };
  };
  return {
    primary,
    spin_enabled: o.spin_enabled === true,
    scratch_enabled: o.scratch_enabled === true,
    reward_config: parseRewardConfig(o.reward_config),
    instagram: link("instagram"),
    whatsapp: link("whatsapp"),
    facebook: link("facebook"),
    website: link("website"),
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
    if (n === 3 || n === 4) return n;
  }
  return 4;
}

export function activeBusinessToDisplay(
  business: ActiveBusiness,
): ReviewDisplayModel {
  const t = resolveBusinessTheme(business);
  const parsedChannels = parseChannels(business.channels);
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
    language: business.language?.trim() || "en",
    googleReviewUrl,
    threshold: normalizeThreshold(business.threshold),
    directRedirect: business.direct_redirect === true,
    allowLowRatingRedirect: business.allow_low_rating_redirect === true,
    customerCareNumber: business.customer_care_number?.trim() || null,
    spinEnabled: parsedChannels?.spin_enabled === true,
    scratchEnabled: parsedChannels?.scratch_enabled === true,
    rewardConfig: parsedChannels?.reward_config ?? [],
    channels: parsedChannels,
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
