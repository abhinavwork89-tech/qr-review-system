import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import {
  resolveMasterQrTargetDestination,
  resolveStoredMasterQrTarget,
  type MasterQrTargetContext,
} from "@/lib/scan/master-qr-target";
import { buildPublicReviewQrUrl } from "@/lib/qr/qr-urls";

export type BusinessMasterRedirectRow = MasterQrTargetContext & {
  id: string;
  status: string;
  is_active: boolean;
};

export async function getBusinessForMasterRedirect(
  businessId: string,
): Promise<BusinessMasterRedirectRow | null> {
  const id = businessId.trim();
  if (!id) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, slug, status, is_active, google_url, channels, whatsapp_country_code, whatsapp_number, resource_urls, master_qr_target, master_qr_type",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const status = normalizeBusinessStatus(row);
  const isActive = row.is_active === true && isBusinessActiveStatus(status);

  if (!isActive) return null;

  return {
    id: String(row.id ?? id),
    status,
    is_active: true,
    slug: typeof row.slug === "string" ? row.slug : "",
    google_url: typeof row.google_url === "string" ? row.google_url : null,
    channels: row.channels,
    whatsapp_country_code:
      typeof row.whatsapp_country_code === "string" ? row.whatsapp_country_code : null,
    whatsapp_number: typeof row.whatsapp_number === "string" ? row.whatsapp_number : null,
    resource_urls: row.resource_urls,
    master_qr_target: typeof row.master_qr_target === "string" ? row.master_qr_target : null,
    master_qr_type: typeof row.master_qr_type === "string" ? row.master_qr_type : null,
  };
}

export function resolveMasterRedirectUrl(
  row: BusinessMasterRedirectRow,
  appOrigin: string,
): string {
  const dest =
    resolveMasterQrTargetDestination(row, appOrigin) ??
    buildPublicReviewQrUrl(appOrigin, row.slug);
  return dest;
}

export function masterTargetLabelForRow(row: BusinessMasterRedirectRow): string {
  return resolveStoredMasterQrTarget(row);
}
