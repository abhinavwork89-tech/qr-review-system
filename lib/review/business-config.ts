import type { BusinessChannels } from "@/lib/types/business";
import { isSafeYouTubeUrl } from "@/lib/review/youtube-url";

export type PublicChannelKey =
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "youtube"
  | "website"
  | "x";

type ChannelKey = PublicChannelKey;

export type PrioritizedChannel = {
  key: ChannelKey;
  url: string;
};

const CHANNEL_ORDER: ChannelKey[] = [
  "instagram",
  "whatsapp",
  "facebook",
  "youtube",
  "website",
  "x",
];

/** Fixed UI order for the public review “Connect” row (no primary/secondary split). */
export const PUBLIC_CHANNEL_DISPLAY_ORDER: PublicChannelKey[] = [
  "whatsapp",
  "website",
  "instagram",
  "facebook",
  "youtube",
  "x",
];

function isChannelUrlValid(key: ChannelKey, url: string): boolean {
  if (key === "youtube") return isSafeYouTubeUrl(url);
  return isSafeHttpUrl(url);
}

export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function shouldAllowPublicRedirect(
  rating: number,
  threshold: number,
  allowLowRatingRedirect: boolean,
): boolean {
  if (rating < 1 || rating > 5) return false;
  const t = Number.isFinite(threshold) ? Math.round(threshold) : 4;
  const clamped = Math.min(5, Math.max(1, t));
  if (rating >= clamped) return true;
  return allowLowRatingRedirect;
}

/**
 * After a successful review submit, external follow-up uses `google_url` only.
 * Threshold + `allow_low_rating_redirect` gate whether we send the user there;
 * social "preferred public" URLs are not used for this path.
 */
export function resolveGoogleReviewSubmitRedirect(input: {
  rating: number;
  threshold: number;
  allowLowRatingRedirect: boolean;
  googleReviewUrl: string;
}): { shouldRedirect: boolean; googleUrl: string | null } {
  const g = input.googleReviewUrl.trim();
  if (!isSafeHttpUrl(g)) {
    return { shouldRedirect: false, googleUrl: null };
  }
  const shouldRedirect = shouldAllowPublicRedirect(
    input.rating,
    input.threshold,
    input.allowLowRatingRedirect,
  );
  return { shouldRedirect, googleUrl: shouldRedirect ? g : null };
}

export function getPrioritizedChannels(
  channels: BusinessChannels | null,
): PrioritizedChannel[] {
  if (!channels) return [];

  const explicitPrimary = readPrimaryChannelKey(channels);

  const items = CHANNEL_ORDER.flatMap((key, index) => {
    const channel = channels[key];
    if (!channel || channel.enabled !== true || !isChannelUrlValid(key, channel.url)) {
      return [];
    }
    const isPrimary = explicitPrimary ? explicitPrimary === key : channel.primary === true;
    return [{ key, url: channel.url.trim(), order: index, isPrimary }];
  });

  items.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.order - b.order;
  });

  return items.map(({ key, url }) => ({ key, url }));
}

/** Enabled public channels in display order (for unified contact icon row). */
export function getEnabledPublicChannels(
  channels: BusinessChannels | null,
): PrioritizedChannel[] {
  if (!channels) return [];
  return PUBLIC_CHANNEL_DISPLAY_ORDER.flatMap((key) => {
    const channel = channels[key];
    if (!channel || channel.enabled !== true || !isChannelUrlValid(key, channel.url)) {
      return [];
    }
    return [{ key, url: channel.url.trim() }];
  });
}

export function getPreferredPublicUrl(input: {
  googleReviewUrl: string;
  channels: BusinessChannels | null;
  /** When true, only the Google review URL is used for redirects (never social channels). */
  directRedirect?: boolean;
}): { url: string | null; sourceLabel: string } {
  if (input.directRedirect === true) {
    if (isSafeHttpUrl(input.googleReviewUrl)) {
      return { url: input.googleReviewUrl.trim(), sourceLabel: "Google" };
    }
    return { url: null, sourceLabel: "Google" };
  }

  const prioritized = getPrioritizedChannels(input.channels);
  if (prioritized.length > 0) {
    return {
      url: prioritized[0]!.url,
      sourceLabel: toChannelLabel(prioritized[0]!.key),
    };
  }
  if (isSafeHttpUrl(input.googleReviewUrl)) {
    return { url: input.googleReviewUrl.trim(), sourceLabel: "Google" };
  }
  return { url: null, sourceLabel: "Google" };
}

function readPrimaryChannelKey(channels: BusinessChannels): ChannelKey | null {
  const raw = (channels as unknown as Record<string, unknown>).primary;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  const key = normalized === "twitter" ? "x" : normalized;
  return CHANNEL_ORDER.includes(key as ChannelKey) ? (key as ChannelKey) : null;
}

function toChannelLabel(key: ChannelKey): string {
  switch (key) {
    case "instagram":
      return "Instagram";
    case "whatsapp":
      return "WhatsApp";
    case "facebook":
      return "Facebook";
    case "youtube":
      return "YouTube";
    case "website":
      return "Website";
    case "x":
      return "X";
    default:
      return "Google";
  }
}
