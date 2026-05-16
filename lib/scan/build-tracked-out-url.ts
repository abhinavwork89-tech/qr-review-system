import type { ScanQrType } from "@/lib/scan/qr-types";

/**
 * Origin for QR payloads: client uses `window`; SSR should set `NEXT_PUBLIC_APP_URL`.
 */
export function scanTrackingPublicOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (env) {
    try {
      const u = new URL(env);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return `${u.protocol}//${u.host}`;
      }
    } catch {
      /* ignore */
    }
  }
  return "http://localhost:3000";
}

export function buildTrackedScanOutPath(
  businessId: string,
  qrType: ScanQrType,
  destinationUrl: string,
): string {
  return `/api/scan/out?b=${encodeURIComponent(businessId)}&t=${encodeURIComponent(qrType)}&u=${encodeURIComponent(destinationUrl)}`;
}

export function buildTrackedScanOutUrl(
  businessId: string,
  qrType: ScanQrType,
  destinationUrl: string,
  /** When set (e.g. from `getServerRequestPublicOrigin`), builds same-host URLs for redirects. */
  originOverride?: string | null,
): string {
  const raw = (originOverride?.trim() || scanTrackingPublicOrigin()).replace(/\/+$/, "");
  return `${raw}${buildTrackedScanOutPath(businessId, qrType, destinationUrl)}`;
}
