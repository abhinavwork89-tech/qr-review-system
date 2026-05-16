import { isSafeHttpUrl } from "@/lib/review/business-config";
import type { BusinessChannels } from "@/lib/types/business";
import type { ScanQrType } from "@/lib/scan/qr-types";
import { resolveWhatsAppHttpsUrl } from "@/lib/whatsapp/wa-me";
import {
  resolveMasterOutboundUrl,
  masterScanDestinationsMatch,
} from "@/lib/scan/master-qr";

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

function urlsEquivalent(a: string, b: string): boolean {
  return normalizeCompareUrl(a) === normalizeCompareUrl(b);
}

function readChannels(raw: unknown): BusinessChannels | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const readLink = (key: string) => {
    const v = o[key];
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const link = v as Record<string, unknown>;
    const enabled = link.enabled === true;
    const url = typeof link.url === "string" ? link.url.trim() : "";
    if (!enabled || !url || !isSafeHttpUrl(url)) return null;
    return url;
  };
  const instagram = readLink("instagram");
  const whatsapp = readLink("whatsapp");
  const facebook = readLink("facebook");
  const website = readLink("website");
  const x =
    readLink("x") ??
    (() => {
      const legacy = o.twitter;
      if (!legacy || typeof legacy !== "object" || Array.isArray(legacy))
        return null;
      const link = legacy as Record<string, unknown>;
      if (link.enabled !== true) return null;
      const url = typeof link.url === "string" ? link.url.trim() : "";
      return url && isSafeHttpUrl(url) ? url : null;
    })();

  if (!instagram && !whatsapp && !facebook && !website && !x) return null;

  const base: BusinessChannels = {
    instagram: { enabled: !!instagram, url: instagram ?? "" },
    whatsapp: { enabled: !!whatsapp, url: whatsapp ?? "" },
    facebook: { enabled: !!facebook, url: facebook ?? "" },
    website: { enabled: !!website, url: website ?? "" },
    x: { enabled: !!x, url: x ?? "" },
  };
  const primaryRaw = o.primary;
  if (typeof primaryRaw === "string") {
    const p = primaryRaw.trim().toLowerCase();
    const key = p === "twitter" ? "x" : p;
    if (["instagram", "whatsapp", "facebook", "website", "x"].includes(key)) {
      base.primary = key as BusinessChannels["primary"];
    }
  }
  return base;
}

function readWhatsappRawFromChannels(raw: unknown): {
  enabled: boolean;
  legacyUrl: string;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { enabled: false, legacyUrl: "" };
  }
  const wa = (raw as Record<string, unknown>).whatsapp;
  if (!wa || typeof wa !== "object" || Array.isArray(wa)) {
    return { enabled: false, legacyUrl: "" };
  }
  const link = wa as Record<string, unknown>;
  return {
    enabled: link.enabled === true,
    legacyUrl: typeof link.url === "string" ? link.url.trim() : "",
  };
}

function readResourceUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const u = item.trim();
    if (u && isSafeHttpUrl(u)) out.push(u);
  }
  return out;
}

export type BusinessScanRow = {
  google_url: string | null;
  channels: unknown;
  resource_urls: unknown;
  whatsapp_country_code?: string | null;
  whatsapp_number?: string | null;
  slug?: string | null;
  master_qr_type?: string | null;
};

/**
 * Ensures `candidateUrl` matches this business configuration for `qrType`
 * (prevents open redirect via `/api/scan/out`).
 */
export function isScanDestinationAllowed(
  row: BusinessScanRow,
  qrType: ScanQrType,
  candidateUrl: string,
  /** Required when `qrType === "master"` (public review page URL for fallback matching). */
  reviewPageAbsoluteUrl?: string,
): boolean {
  const dest = trimUrl(candidateUrl);
  if (!dest || !isSafeHttpUrl(dest)) return false;

  if (qrType === "master") {
    const review = (reviewPageAbsoluteUrl ?? "").trim();
    if (!review || !isSafeHttpUrl(review)) return false;
    const expected = resolveMasterOutboundUrl(
      {
        master_qr_type: row.master_qr_type,
        google_url: row.google_url,
        channels: row.channels,
        whatsapp_country_code: row.whatsapp_country_code,
        whatsapp_number: row.whatsapp_number,
      },
      review,
    );
    if (!expected || !isSafeHttpUrl(expected)) return false;
    return masterScanDestinationsMatch(expected, dest);
  }

  if (qrType === "google") {
    const g = row.google_url?.trim() ?? "";
    return g.length > 0 && isSafeHttpUrl(g) && urlsEquivalent(g, dest);
  }

  if (qrType === "whatsapp") {
    const rawWa = readWhatsappRawFromChannels(row.channels);
    const expected = resolveWhatsAppHttpsUrl({
      countryCode:
        typeof row.whatsapp_country_code === "string" ? row.whatsapp_country_code : null,
      localNumber: typeof row.whatsapp_number === "string" ? row.whatsapp_number : null,
      legacyChannelUrl: rawWa.legacyUrl,
      channelEnabled: rawWa.enabled,
    });
    if (!expected || !isSafeHttpUrl(expected)) return false;
    return urlsEquivalent(expected, dest);
  }

  const channels = readChannels(row.channels);
  if (!channels) {
    return false;
  }

  const pick = (
    key: keyof Pick<
      BusinessChannels,
      "instagram" | "facebook" | "website" | "x"
    >,
  ): boolean => {
    const ch = channels[key];
    return (
      ch?.enabled === true &&
      typeof ch.url === "string" &&
      ch.url.length > 0 &&
      urlsEquivalent(ch.url, dest)
    );
  };

  switch (qrType) {
    case "instagram":
      return pick("instagram");
    case "facebook":
      return pick("facebook");
    case "website":
      return pick("website");
    case "x":
      return pick("x");
    case "resource": {
      for (const u of readResourceUrls(row.resource_urls)) {
        if (urlsEquivalent(u, dest)) return true;
      }
      return false;
    }
    default:
      return false;
  }
}
