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
  return `${raw}${buildTrackedScanOutPath(businessId, qrType, destinationUrl)}`;
}
