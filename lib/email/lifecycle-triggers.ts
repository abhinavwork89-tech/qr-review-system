import type { QrImageAsset } from "@/emails/types";
import {
  sendBusinessStatusEmail,
  sendPlanExpiredEmail,
  sendPlanRenewedEmail,
} from "@/lib/email/send-transactional-emails";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { buildAdminBusinessUrl, buildReviewPageUrl } from "@/lib/email/app-public-url";
import { normalizeBusinessStatus } from "@/lib/business/status";

export function resourceUrlsToQrImages(urls: unknown): QrImageAsset[] {
  if (!Array.isArray(urls)) return [];
  const out: QrImageAsset[] = [];
  let i = 0;
  for (const item of urls) {
    if (typeof item !== "string") continue;
    const src = item.trim();
    if (!src) continue;
    try {
      const u = new URL(src);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    } catch {
      continue;
    }
    i += 1;
    out.push({ src, alt: `QR code ${i}` });
  }
  return out;
}

function planRank(plan: string): number {
  const t = plan.trim().toLowerCase();
  if (t === "pro_plus" || t === "pro-plus") return 2;
  if (t === "pro") return 1;
  if (t === "expired") return -1;
  return 0;
}

function formatPlanLabel(plan: string): string {
  const s = plan.trim();
  if (!s) return "Plan";
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scheduleWelcomeEmailAfterCreate(input: {
  businessId: string;
  slug: string;
  name: string;
  brandName: string;
  email: string;
  logoUrl: string | null;
  primaryColor: string | null;
  resourceUrls: unknown;
}): void {
  void (async () => {
    try {
      await sendWelcomeEmail({
        dedupeKey: `welcome:${input.businessId}`,
        ownerFullName: input.name.trim() || "there",
        brandName: input.brandName.trim() || input.name.trim() || "Your business",
        businessEmail: input.email.trim() || null,
        clientLogoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        reviewPageUrl: buildReviewPageUrl(input.slug),
        qrImages: resourceUrlsToQrImages(input.resourceUrls),
      });
    } catch (err) {
      console.error(
        "[email] welcome lifecycle error",
        err instanceof Error ? err.message : String(err),
      );
    }
  })();
}

type BusinessRowFields = {
  id?: unknown;
  status?: unknown;
  is_active?: unknown;
  plan_type?: unknown;
  name?: unknown;
  brand_name?: unknown;
  email?: unknown;
  logo_url?: unknown;
  primary_color?: unknown;
};

export function schedulePatchLifecycleEmails(input: {
  businessId: string;
  before: BusinessRowFields;
  patch: Record<string, unknown>;
}): void {
  const merged: Record<string, unknown> = {
    ...input.before,
    ...input.patch,
  };

  const oldStatus = normalizeBusinessStatus(input.before as { status?: unknown; is_active?: unknown });
  const newStatus = normalizeBusinessStatus(merged as { status?: unknown; is_active?: unknown });

  const oldPlan =
    typeof input.before.plan_type === "string"
      ? input.before.plan_type.trim()
      : "";
  const newPlanFromPatch =
    "plan_type" in input.patch && typeof input.patch.plan_type === "string"
      ? input.patch.plan_type.trim()
      : null;
  const newPlan =
    newPlanFromPatch !== null ? newPlanFromPatch : oldPlan;

  const name =
    typeof merged.name === "string" ? merged.name.trim() : "";
  const brandNameRaw =
    typeof merged.brand_name === "string" ? merged.brand_name.trim() : "";
  const brandName = brandNameRaw || name || "Your business";
  const ownerFullName = name || "there";
  const businessEmail =
    typeof merged.email === "string" && merged.email.trim()
      ? merged.email.trim()
      : null;
  const clientLogoUrl =
    typeof merged.logo_url === "string" && merged.logo_url.trim()
      ? merged.logo_url.trim()
      : null;
  const primaryColor =
    typeof merged.primary_color === "string" ? merged.primary_color : null;

  const brand = {
    ownerFullName,
    brandName,
    businessEmail,
    clientLogoUrl,
    primaryColor,
  };

  const dashboardUrl = buildAdminBusinessUrl(input.businessId);

  void (async () => {
    try {
      if (
        "plan_type" in input.patch &&
        newPlanFromPatch !== null &&
        newPlanFromPatch !== "" &&
        newPlan !== oldPlan
      ) {
        const oldR = planRank(oldPlan);
        const newR = planRank(newPlan);
        if (newR > oldR) {
          await sendPlanRenewedEmail({
            ...brand,
            dedupeKey: `plan_renewed:${input.businessId}:${newPlan}`,
            planName: formatPlanLabel(newPlan),
            renewedOn: new Date().toISOString().slice(0, 10),
            dashboardUrl,
          });
        } else if (newR < oldR && oldR > 0) {
          await sendPlanExpiredEmail({
            ...brand,
            dedupeKey: `plan_expired:${input.businessId}:${newPlan}`,
            planName: formatPlanLabel(oldPlan || newPlan),
            expiredOn: new Date().toISOString().slice(0, 10),
            renewUrl: dashboardUrl,
          });
        }
      }

      if (newStatus !== oldStatus && (newStatus === "active" || newStatus === "inactive")) {
        await sendBusinessStatusEmail({
          ...brand,
          dedupeKey: `business_status:${input.businessId}:${oldStatus}->${newStatus}`,
          status: newStatus,
          dashboardUrl,
        });
      }
    } catch (err) {
      console.error(
        "[email] patch lifecycle error",
        err instanceof Error ? err.message : String(err),
      );
    }
  })();
}
