import {
  emailFlowErrorWithCause,
  emailFlowInfo,
} from "@/lib/email/email-flow-log";
import {
  sendBusinessStatusEmail,
  sendPlanExpiredEmail,
  sendPlanRenewedEmail,
} from "@/lib/email/send-transactional-emails";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { buildAdminBusinessUrl, buildReviewPageUrl } from "@/lib/email/app-public-url";
import { buildWelcomeEmailMasterQrContext } from "@/lib/email/welcome-master-qr";
import { normalizeBusinessStatus } from "@/lib/business/status";

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
  google_url: string | null;
  channels: unknown;
  whatsapp_country_code: string | null;
  whatsapp_number: string | null;
  master_qr_type: string | null;
}): void {
  void (async () => {
    try {
      emailFlowInfo("lifecycle_trigger_scheduled", {
        eventTrigger: "welcome",
        correlationId: input.businessId,
        slug: input.slug,
      });
      const brandLabel =
        input.brandName.trim() || input.name.trim() || "Your business";
      const { qrImages, debug } = buildWelcomeEmailMasterQrContext({
        businessId: input.businessId,
        slug: input.slug,
        brandName: brandLabel,
        google_url: input.google_url,
        channels: input.channels,
        whatsapp_country_code: input.whatsapp_country_code,
        whatsapp_number: input.whatsapp_number,
        master_qr_type: input.master_qr_type,
      });
      emailFlowInfo("welcome_email_qr_resolved", {
        eventTrigger: "welcome",
        correlationId: input.businessId,
        resolvedQrSource: debug.payloadSource,
        master_qr_type: debug.master_qr_type,
        finalQrImageUrl: debug.finalQrImageUrl,
        finalQrPayload: debug.finalQrPayload,
        masterTrackUrl: debug.masterTrackUrl,
        resolvedScanOutbound: debug.resolvedScanOutbound,
        emailTemplatePayload: {
          qrImageCount: qrImages.length,
          reviewPageUrl: buildReviewPageUrl(input.slug),
        },
      });
      const sendResult = await sendWelcomeEmail({
        businessId: input.businessId,
        dedupeKey: `welcome:${input.businessId}`,
        ownerFullName: input.name.trim() || "there",
        brandName: brandLabel,
        businessEmail: input.email.trim() || null,
        clientLogoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        reviewPageUrl: buildReviewPageUrl(input.slug),
        qrImages,
      });
      emailFlowInfo("lifecycle_trigger_finished", {
        eventTrigger: "welcome",
        correlationId: input.businessId,
        resendMessageId:
          sendResult && typeof sendResult === "object" && "id" in sendResult
            ? String((sendResult as { id: unknown }).id)
            : null,
        outbound:
          sendResult === null
            ? "skipped_duplicate_or_no_recipient"
            : "resend_accepted",
      });
    } catch (err) {
      emailFlowErrorWithCause(
        "lifecycle_trigger_failed",
        { eventTrigger: "welcome", correlationId: input.businessId },
        err,
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
          emailFlowInfo("lifecycle_trigger_scheduled", {
            eventTrigger: "plan_renewed",
            correlationId: input.businessId,
            oldPlan,
            newPlan,
          });
          const renewedResult = await sendPlanRenewedEmail({
            ...brand,
            correlationId: input.businessId,
            dedupeKey: `plan_renewed:${input.businessId}:${newPlan}`,
            planName: formatPlanLabel(newPlan),
            renewedOn: new Date().toISOString().slice(0, 10),
            dashboardUrl,
          });
          emailFlowInfo("lifecycle_trigger_finished", {
            eventTrigger: "plan_renewed",
            correlationId: input.businessId,
            resendMessageId:
              renewedResult &&
              typeof renewedResult === "object" &&
              "id" in renewedResult
                ? String((renewedResult as { id: unknown }).id)
                : null,
            outbound:
              renewedResult === null
                ? "skipped_duplicate_or_no_recipient"
                : "resend_accepted",
          });
        } else if (newR < oldR && oldR > 0) {
          emailFlowInfo("lifecycle_trigger_scheduled", {
            eventTrigger: "plan_expired",
            correlationId: input.businessId,
            oldPlan,
            newPlan,
          });
          const expiredResult = await sendPlanExpiredEmail({
            ...brand,
            correlationId: input.businessId,
            dedupeKey: `plan_expired:${input.businessId}:${newPlan}`,
            planName: formatPlanLabel(oldPlan || newPlan),
            expiredOn: new Date().toISOString().slice(0, 10),
            renewUrl: dashboardUrl,
          });
          emailFlowInfo("lifecycle_trigger_finished", {
            eventTrigger: "plan_expired",
            correlationId: input.businessId,
            resendMessageId:
              expiredResult &&
              typeof expiredResult === "object" &&
              "id" in expiredResult
                ? String((expiredResult as { id: unknown }).id)
                : null,
            outbound:
              expiredResult === null
                ? "skipped_duplicate_or_no_recipient"
                : "resend_accepted",
          });
        }
      }

      if (newStatus !== oldStatus && (newStatus === "active" || newStatus === "inactive")) {
        emailFlowInfo("lifecycle_trigger_scheduled", {
          eventTrigger: "business_status",
          correlationId: input.businessId,
          oldStatus,
          newStatus,
        });
        const statusResult = await sendBusinessStatusEmail({
          ...brand,
          correlationId: input.businessId,
          dedupeKey: `business_status:${input.businessId}:${oldStatus}->${newStatus}`,
          status: newStatus,
          dashboardUrl,
        });
        emailFlowInfo("lifecycle_trigger_finished", {
          eventTrigger: "business_status",
          correlationId: input.businessId,
          resendMessageId:
            statusResult && typeof statusResult === "object" && "id" in statusResult
              ? String((statusResult as { id: unknown }).id)
              : null,
          outbound:
            statusResult === null
              ? "skipped_duplicate_or_no_recipient"
              : "resend_accepted",
        });
      }
    } catch (err) {
      emailFlowErrorWithCause(
        "lifecycle_patch_emails_failed",
        { correlationId: input.businessId, oldStatus, newStatus, oldPlan, newPlan },
        err,
      );
    }
  })();
}
