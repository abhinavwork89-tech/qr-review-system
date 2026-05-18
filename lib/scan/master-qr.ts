import { isSafeHttpUrl } from "@/lib/review/business-config";
import { isSafeYouTubeUrl } from "@/lib/review/youtube-url";
import { resolveWhatsAppHttpsUrl } from "@/lib/whatsapp/wa-me";

export const MASTER_QR_TYPE_VALUES = [
  "google_review",
  "instagram",
  "facebook",
  "youtube",
  "whatsapp",
  "twitter",
  "website",
] as const;

export type MasterQrType = (typeof MASTER_QR_TYPE_VALUES)[number];

const MASTER_SET = new Set<string>(MASTER_QR_TYPE_VALUES);

export function normalizeMasterQrType(raw: unknown): MasterQrType | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  if (t === "x") return "twitter";
  if (MASTER_SET.has(t)) return t as MasterQrType;
  return null;
}

function trimUrl(value: string): string {
  return value.trim();
}

function normalizeCompareUrl(value: string): string {
  const t = trimUrl(value);
  try {
    const u = new URL(t);
    u.hash = "";
    return u.href;
  } catch {
    return t;
  }
}

/** Compare outbound URLs for scan allowlist (master redirect). */
export function masterScanDestinationsMatch(a: string, b: string): boolean {
  return normalizeCompareUrl(a) === normalizeCompareUrl(b);
}

function googleHttps(googleUrl: string | null | undefined): string | null {
  const u = (googleUrl ?? "").trim();
  return u.length > 0 && isSafeHttpUrl(u) ? u : null;
}

function readWhatsappRaw(channelsRaw: unknown): { enabled: boolean; legacyUrl: string } {
  if (!channelsRaw || typeof channelsRaw !== "object" || Array.isArray(channelsRaw)) {
    return { enabled: false, legacyUrl: "" };
  }
  const wa = (channelsRaw as Record<string, unknown>).whatsapp;
  if (!wa || typeof wa !== "object" || Array.isArray(wa)) {
    return { enabled: false, legacyUrl: "" };
  }
  const link = wa as Record<string, unknown>;
  return {
    enabled: link.enabled === true,
    legacyUrl: typeof link.url === "string" ? link.url.trim() : "",
  };
}

function readEnabledChannelUrl(
  channelsRaw: unknown,
  key: "instagram" | "facebook" | "website",
): string | null {
  if (!channelsRaw || typeof channelsRaw !== "object" || Array.isArray(channelsRaw)) return null;
  const block = (channelsRaw as Record<string, unknown>)[key];
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const link = block as Record<string, unknown>;
  if (link.enabled !== true) return null;
  const url = typeof link.url === "string" ? link.url.trim() : "";
  return url.length > 0 && isSafeHttpUrl(url) ? url : null;
}

function readEnabledYouTubeUrl(channelsRaw: unknown): string | null {
  if (!channelsRaw || typeof channelsRaw !== "object" || Array.isArray(channelsRaw)) return null;
  const block = (channelsRaw as Record<string, unknown>).youtube;
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const link = block as Record<string, unknown>;
  if (link.enabled !== true) return null;
  const url = typeof link.url === "string" ? link.url.trim() : "";
  return url.length > 0 && isSafeYouTubeUrl(url) ? url : null;
}

function readXTwitterUrl(channelsRaw: unknown): string | null {
  if (!channelsRaw || typeof channelsRaw !== "object" || Array.isArray(channelsRaw)) return null;
  const o = channelsRaw as Record<string, unknown>;
  const tryBlock = (v: unknown): string | null => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const link = v as Record<string, unknown>;
    if (link.enabled !== true) return null;
    const url = typeof link.url === "string" ? link.url.trim() : "";
    return url.length > 0 && isSafeHttpUrl(url) ? url : null;
  };
  return tryBlock(o.x) ?? tryBlock(o.twitter);
}

export type MasterQrResolutionInput = {
  master_qr_type?: string | null;
  google_url?: string | null;
  channels?: unknown;
  whatsapp_country_code?: string | null;
  whatsapp_number?: string | null;
};

/** Only the configured master target (no fallbacks). */
export function resolveStrictMasterDestination(row: MasterQrResolutionInput): string | null {
  const mt = normalizeMasterQrType(row.master_qr_type);
  if (!mt) return null;
  switch (mt) {
    case "google_review":
      return googleHttps(row.google_url);
    case "instagram":
      return readEnabledChannelUrl(row.channels, "instagram");
    case "facebook":
      return readEnabledChannelUrl(row.channels, "facebook");
    case "youtube":
      return readEnabledYouTubeUrl(row.channels);
    case "website":
      return readEnabledChannelUrl(row.channels, "website");
    case "twitter":
      return readXTwitterUrl(row.channels);
    case "whatsapp": {
      const raw = readWhatsappRaw(row.channels);
      const url = resolveWhatsAppHttpsUrl({
        countryCode: row.whatsapp_country_code,
        localNumber: row.whatsapp_number,
        legacyChannelUrl: raw.legacyUrl,
        channelEnabled: raw.enabled,
      });
      const t = url.trim();
      return t.length > 0 && isSafeHttpUrl(t) ? t : null;
    }
    default:
      return null;
  }
}

type DefaultInput = Omit<MasterQrResolutionInput, "master_qr_type">;

function whatsappOutbound(input: DefaultInput): string | null {
  return resolveStrictMasterDestination({ ...input, master_qr_type: "whatsapp" });
}

/** Default master when none stored: Google if valid, else first enabled channel with a valid URL. */
export function computeDefaultMasterQrType(input: DefaultInput): MasterQrType {
  if (googleHttps(input.google_url)) return "google_review";
  if (readEnabledChannelUrl(input.channels, "instagram")) return "instagram";
  if (readEnabledChannelUrl(input.channels, "facebook")) return "facebook";
  if (readEnabledYouTubeUrl(input.channels)) return "youtube";
  if (whatsappOutbound(input)) return "whatsapp";
  if (readXTwitterUrl(input.channels)) return "twitter";
  if (readEnabledChannelUrl(input.channels, "website")) return "website";
  return "google_review";
}

/**
 * Destination for a master QR scan: strict master, then Google, then website,
 * then the public review page URL (always safe fallback).
 */
export function resolveMasterOutboundUrl(
  row: MasterQrResolutionInput,
  reviewPageAbsoluteUrl: string,
): string {
  const strict = resolveStrictMasterDestination(row);
  if (strict) return strict;
  const g = googleHttps(row.google_url);
  if (g) return g;
  const w = readEnabledChannelUrl(row.channels, "website");
  if (w) return w;
  const r = reviewPageAbsoluteUrl.trim();
  return isSafeHttpUrl(r) ? r : reviewPageAbsoluteUrl;
}

export function validateMasterQrForPersist(
  row: MasterQrResolutionInput & { master_qr_type: MasterQrType },
): string | null {
  if (!resolveStrictMasterDestination(row)) {
    return "Master QR must use an enabled channel with a valid link (or Google Review URL).";
  }
  return null;
}

type PersistBase = Omit<MasterQrResolutionInput, "master_qr_type">;

/**
 * Pick a storable master type after merges (PATCH): prefer explicit when valid,
 * else default, else first channel that resolves, else null.
 */
export function resolvePersistedMasterQrType(
  base: PersistBase,
  preferredRaw: string | null | undefined,
): MasterQrType | null {
  const pref = normalizeMasterQrType(preferredRaw);
  if (pref && validateMasterQrForPersist({ ...base, master_qr_type: pref }) === null) {
    return pref;
  }
  const d = computeDefaultMasterQrType(base);
  if (validateMasterQrForPersist({ ...base, master_qr_type: d }) === null) {
    return d;
  }
  const order: MasterQrType[] = [
    "google_review",
    "instagram",
    "facebook",
    "youtube",
    "whatsapp",
    "twitter",
    "website",
  ];
  for (const t of order) {
    if (validateMasterQrForPersist({ ...base, master_qr_type: t }) === null) {
      return t;
    }
  }
  return null;
}

export function formatMasterQrTypeLabel(t: MasterQrType): string {
  switch (t) {
    case "google_review":
      return "Google Review";
    case "twitter":
      return "X (Twitter)";
    case "youtube":
      return "YouTube";
    default:
      return t.charAt(0).toUpperCase() + t.slice(1);
  }
}
