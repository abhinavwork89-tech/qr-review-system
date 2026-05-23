import type { MasterQrType } from "@/lib/scan/master-qr";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { isSafeYouTubeUrl } from "@/lib/review/youtube-url";
import { parsePublicResourceUrls } from "@/lib/review/parse-resource-urls";
import { buildMasterQrPayloadUrl, buildPublicReviewQrUrl } from "@/lib/qr/qr-urls";
import { resolveWhatsAppHttpsUrl } from "@/lib/whatsapp/wa-me";

export const MASTER_QR_TARGET_VALUES = [
  "review_page",
  "google_review",
  "instagram",
  "facebook",
  "whatsapp",
  "website",
  "youtube",
  "x",
  "resource",
] as const;

export type MasterQrTarget = (typeof MASTER_QR_TARGET_VALUES)[number];

const TARGET_SET = new Set<string>(MASTER_QR_TARGET_VALUES);

export function normalizeMasterQrTarget(raw: unknown): MasterQrTarget | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  if (t === "twitter") return "x";
  if (TARGET_SET.has(t)) return t as MasterQrTarget;
  return null;
}

/** Map legacy `master_qr_type` to new target (best effort). */
export function masterQrTypeToTarget(raw: unknown): MasterQrTarget | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  if (t === "twitter") return "x";
  if (t === "google_review") return "google_review";
  if (t === "instagram") return "instagram";
  if (t === "facebook") return "facebook";
  if (t === "whatsapp") return "whatsapp";
  if (t === "website") return "website";
  if (t === "youtube") return "youtube";
  return null;
}

export type MasterQrTargetContext = {
  master_qr_target?: string | null;
  master_qr_type?: string | null;
  slug: string;
  google_url?: string | null;
  channels?: unknown;
  whatsapp_country_code?: string | null;
  whatsapp_number?: string | null;
  resource_urls?: unknown;
};

export function resolveStoredMasterQrTarget(row: MasterQrTargetContext): MasterQrTarget {
  return (
    normalizeMasterQrTarget(row.master_qr_target) ??
    masterQrTypeToTarget(row.master_qr_type) ??
    "review_page"
  );
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

function firstResourceUrl(resourceUrls: unknown): string | null {
  const list = parsePublicResourceUrls(resourceUrls);
  return list.length > 0 ? list[0]! : null;
}

/**
 * Direct destination for a master QR target (no `/api/scan/out` tracking).
 */
export function resolveMasterQrTargetDestination(
  row: MasterQrTargetContext,
  appOrigin: string,
  targetOverride?: MasterQrTarget,
): string | null {
  const target = targetOverride ?? resolveStoredMasterQrTarget(row);
  const origin = appOrigin.trim().replace(/\/+$/, "");
  const slug = row.slug.trim();

  switch (target) {
    case "review_page":
      return slug ? buildPublicReviewQrUrl(origin, slug) : null;
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
    case "x":
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
    case "resource":
      return firstResourceUrl(row.resource_urls);
    default:
      return null;
  }
}

export function formatMasterQrTargetLabel(target: MasterQrTarget): string {
  switch (target) {
    case "review_page":
      return "Public Review Page";
    case "google_review":
      return "Google Review";
    case "x":
      return "X (Twitter)";
    case "youtube":
      return "YouTube";
    case "resource":
      return "Resource";
    default:
      return target.charAt(0).toUpperCase() + target.slice(1);
  }
}

export type MasterQrTargetEligibility = {
  target: MasterQrTarget;
  eligible: boolean;
};

/** Whether each target can be selected given current business links. */
export function listMasterQrTargetEligibility(
  row: Omit<MasterQrTargetContext, "master_qr_target" | "master_qr_type">,
  appOrigin: string,
): MasterQrTargetEligibility[] {
  return MASTER_QR_TARGET_VALUES.map((target) => ({
    target,
    eligible:
      target === "review_page"
        ? Boolean(row.slug?.trim())
        : Boolean(resolveMasterQrTargetDestination(row, appOrigin, target)),
  }));
}

export function validateMasterQrTargetForPersist(
  row: MasterQrTargetContext,
  target: MasterQrTarget,
  appOrigin: string,
): string | null {
  if (target === "review_page") {
    return row.slug?.trim() ? null : "Business slug is required for Public Review Page target.";
  }
  if (!resolveMasterQrTargetDestination(row, appOrigin, target)) {
    return `Enable and save a valid link for “${formatMasterQrTargetLabel(target)}” before selecting this master target.`;
  }
  return null;
}

export function buildMasterQrAbsoluteUrl(appOrigin: string, businessId: string): string {
  return buildMasterQrPayloadUrl(appOrigin, businessId);
}

/** Legacy `master_qr_type` column sync when persisting `master_qr_target`. */
export function masterQrTargetToLegacyType(target: MasterQrTarget): MasterQrType | null {
  switch (target) {
    case "google_review":
      return "google_review";
    case "instagram":
      return "instagram";
    case "facebook":
      return "facebook";
    case "whatsapp":
      return "whatsapp";
    case "website":
      return "website";
    case "youtube":
      return "youtube";
    case "x":
      return "twitter";
    default:
      return null;
  }
}
