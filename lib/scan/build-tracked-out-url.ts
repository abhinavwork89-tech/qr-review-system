import { buildMasterQrPayloadUrl } from "@/lib/qr/qr-urls";
import type { ScanQrType } from "@/lib/scan/qr-types";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";

/**
 * Origin for QR payloads and tracked scan-out links.
 * @see resolvePublicAppOrigin
 */
export function scanTrackingPublicOrigin(): string {
  return resolvePublicAppOrigin();
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
  // Master QR architecture v2: permanent `/m/{businessId}` only (never scan/out).
  if (qrType === "master") {
    return buildMasterQrPayloadUrl(raw, businessId);
  }
  return `${raw}${buildTrackedScanOutPath(businessId, qrType, destinationUrl)}`;
}
