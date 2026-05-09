export type BusinessChannelLink = {
  enabled: boolean;
  url: string;
  /** Optional hint used to prioritize a channel in review redirects. */
  primary?: boolean;
};

export type BusinessChannels = {
  /** Optional top-priority channel key. */
  primary?: "instagram" | "whatsapp" | "facebook" | "website";
  /** Optional game flags stored in channels json. */
  spin_enabled?: boolean;
  scratch_enabled?: boolean;
  reward_config?: string[];
  instagram: BusinessChannelLink;
  whatsapp: BusinessChannelLink;
  facebook: BusinessChannelLink;
  website: BusinessChannelLink;
};

export type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  is_active: boolean;
  theme_primary: string | null;
  theme_background: string | null;
  theme_foreground: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  language: string | null;
  google_url: string | null;
  threshold: number | null;
  direct_redirect: boolean | null;
  allow_low_rating_redirect: boolean | null;
  customer_care_number: string | null;
  channels: unknown;
  banner_urls: unknown;
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
