import type { MasterQrType } from "@/lib/scan/master-qr";

export type BusinessChannelLink = {
  enabled: boolean;
  url: string;
  /** Optional hint used to prioritize a channel in review redirects. */
  primary?: boolean;
};

export type BusinessChannels = {
  /** Optional top-priority channel key. */
  primary?: "instagram" | "whatsapp" | "facebook" | "youtube" | "website" | "x";
  /** Optional game flags stored in channels json. */
  spin_enabled?: boolean;
  scratch_enabled?: boolean;
  reward_config?: string[];
  instagram: BusinessChannelLink;
  whatsapp: BusinessChannelLink;
  facebook: BusinessChannelLink;
  youtube: BusinessChannelLink;
  website: BusinessChannelLink;
  /** X (Twitter); legacy DB may store the same under `twitter`. */
  x: BusinessChannelLink;
};

export type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  status: "active" | "inactive" | "deleted";
  is_active: boolean;
  theme_primary: string | null;
  theme_background: string | null;
  theme_foreground: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  language: string | null;
  google_url: string | null;
  /** Subscription / tier key (e.g. free, pro) — used for AI suggestion count caps. */
  plan_type?: string | null;
  threshold: number | null;
  direct_redirect: boolean | null;
  allow_low_rating_redirect: boolean | null;
  customer_care_number: string | null;
  /** WhatsApp dial (e.g. +91); national digits in `whatsapp_number`. */
  whatsapp_country_code?: string | null;
  whatsapp_number?: string | null;
  /** Public Call CTA: `tel:+{call_country_code}{call_number}` when enabled and valid. */
  call_enabled?: boolean | null;
  call_country_code?: string | null;
  call_number?: string | null;
  channels: unknown;
  banner_urls: unknown;
  /** Hosted digital assets (images, PDFs, etc.) for the public review page. */
  resource_urls?: unknown;
  /** Stored master QR key; null/invalid rows fall back at read time. */
  master_qr_type?: MasterQrType | null;
  ai_enabled?: boolean | null;
  ai_review_language?: string | null;
  ai_daily_limit?: number | null;
  ai_suggestions_count?: number | null;
};

export type BusinessTheme = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
};

export type ActiveBusiness = BusinessRow & { is_active: true };

export type InactiveBusinessForReview = Pick<
  BusinessRow,
  | "name"
  | "brand_name"
  | "logo_url"
  | "theme_primary"
  | "theme_background"
  | "theme_foreground"
  | "primary_color"
  | "secondary_color"
>;
