import { isSafeHttpUrl } from "@/lib/review/business-config";
import { isSafeYouTubeUrl } from "@/lib/review/youtube-url";
import type { MasterQrType } from "@/lib/scan/master-qr";

export type AdminUrlChannelKey = "instagram" | "facebook" | "youtube" | "website" | "x";

export type AdminUrlChannelDef = {
  key: AdminUrlChannelKey;
  label: string;
  masterQrType: MasterQrType;
  urlKind: "http" | "youtube";
};

/**
 * URL-based social channels in admin Add / Edit forms (order matches public connect row).
 * WhatsApp and Call use dedicated field components between Instagram and Facebook.
 */
export const ADMIN_URL_CHANNEL_DEFS: readonly AdminUrlChannelDef[] = [
  { key: "instagram", label: "Instagram", masterQrType: "instagram", urlKind: "http" },
  { key: "facebook", label: "Facebook", masterQrType: "facebook", urlKind: "http" },
  { key: "youtube", label: "YouTube", masterQrType: "youtube", urlKind: "youtube" },
  { key: "website", label: "Website", masterQrType: "website", urlKind: "http" },
  { key: "x", label: "X (Twitter)", masterQrType: "twitter", urlKind: "http" },
] as const;

export function isAdminUrlChannelEligible(
  def: AdminUrlChannelDef,
  enabled: boolean,
  url: string,
): boolean {
  if (!enabled) return false;
  const t = url.trim();
  return def.urlKind === "youtube" ? isSafeYouTubeUrl(t) : isSafeHttpUrl(t);
}
