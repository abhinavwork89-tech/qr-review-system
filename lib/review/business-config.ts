import type { BusinessChannels } from "@/lib/types/business";

type ChannelKey = "instagram" | "whatsapp" | "facebook" | "website";

export type PrioritizedChannel = {
  key: ChannelKey;
  url: string;
};

const CHANNEL_ORDER: ChannelKey[] = [
  "instagram",
  "whatsapp",
  "facebook",
  "website",
];

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
  if (rating >= threshold) return true;
  return allowLowRatingRedirect;
}

export function getPrioritizedChannels(
  channels: BusinessChannels | null,
): PrioritizedChannel[] {
  if (!channels) return [];

  const explicitPrimary = readPrimaryChannelKey(channels);

  const items = CHANNEL_ORDER.flatMap((key, index) => {
    const channel = channels[key];
    if (!channel || channel.enabled !== true || !isSafeHttpUrl(channel.url)) {
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

export function getPreferredPublicUrl(input: {
  googleReviewUrl: string;
  channels: BusinessChannels | null;
}): { url: string | null; sourceLabel: string } {
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
  return CHANNEL_ORDER.includes(normalized as ChannelKey)
    ? (normalized as ChannelKey)
    : null;
}

function toChannelLabel(key: ChannelKey): string {
  switch (key) {
    case "instagram":
      return "Instagram";
    case "whatsapp":
      return "WhatsApp";
    case "facebook":
      return "Facebook";
    case "website":
      return "Website";
    default:
      return "Google";
  }
}
