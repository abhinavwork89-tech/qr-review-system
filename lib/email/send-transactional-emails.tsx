import { createElement } from "react";
import { BusinessStatusEmail } from "@/emails/templates/BusinessStatusEmail";
import { PlanExpiredEmail } from "@/emails/templates/PlanExpiredEmail";
import { PlanRenewedEmail } from "@/emails/templates/PlanRenewedEmail";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { resolveBusinessRecipient } from "@/lib/email/resolve-recipient";
import { sanitizePrimaryColor } from "@/lib/email/sanitize-primary-color";
import { sendAppEmail } from "@/lib/email/send-app-email";

type BrandFields = {
  ownerFullName: string;
  brandName: string;
  businessEmail: string | null;
  clientLogoUrl: string | null;
  primaryColor: string | null;
  dedupeKey?: string;
};

async function baseBrand(props: BrandFields) {
  const settings = await getAppSettingsPublic();
  const primary = sanitizePrimaryColor(props.primaryColor);
  const brandName = props.brandName.trim() || "Your business";
  return {
    settings,
    primary,
    brandName,
  };
}

export async function sendPlanExpiredEmail(
  props: BrandFields & {
    planName: string;
    expiredOn?: string;
    renewUrl?: string;
    ctaText?: string;
    subject?: string;
  },
) {
  const { settings, primary, brandName } = await baseBrand(props);
  const recipient = resolveBusinessRecipient(props.businessEmail);
  if (!recipient) {
    console.warn(
      "[email] skip plan_expired: no business email and no ADMIN_EMAIL fallback",
    );
    return null;
  }
  const subject = props.subject?.trim() || `Plan expired — ${brandName}`;
  return sendAppEmail({
    to: recipient,
    subject,
    businessEmail: props.businessEmail,
    businessDisplayName: brandName,
    templateType: "plan_expired",
    dedupeKey: props.dedupeKey,
    react: createElement(PlanExpiredEmail, {
      oneCoreLogoUrl: settings.brandingLogoUrl,
      clientBrandLogoUrl: props.clientLogoUrl,
      primaryColor: primary,
      ownerFullName: props.ownerFullName,
      brandName,
      footerCopyrightYear: settings.copyrightYear,
      planName: props.planName,
      expiredOn: props.expiredOn,
      renewUrl: props.renewUrl,
      ctaText: props.ctaText,
    }),
  });
}

export async function sendPlanRenewedEmail(
  props: BrandFields & {
    planName: string;
    renewedOn?: string;
    dashboardUrl?: string;
    ctaText?: string;
    subject?: string;
  },
) {
  const { settings, primary, brandName } = await baseBrand(props);
  const recipient = resolveBusinessRecipient(props.businessEmail);
  if (!recipient) {
    console.warn(
      "[email] skip plan_renewed: no business email and no ADMIN_EMAIL fallback",
    );
    return null;
  }
  const subject = props.subject?.trim() || `Plan renewed — ${brandName}`;
  return sendAppEmail({
    to: recipient,
    subject,
    businessEmail: props.businessEmail,
    businessDisplayName: brandName,
    templateType: "plan_renewed",
    dedupeKey: props.dedupeKey,
    react: createElement(PlanRenewedEmail, {
      oneCoreLogoUrl: settings.brandingLogoUrl,
      clientBrandLogoUrl: props.clientLogoUrl,
      primaryColor: primary,
      ownerFullName: props.ownerFullName,
      brandName,
      footerCopyrightYear: settings.copyrightYear,
      planName: props.planName,
      renewedOn: props.renewedOn,
      dashboardUrl: props.dashboardUrl,
      ctaText: props.ctaText,
    }),
  });
}

export async function sendBusinessStatusEmail(
  props: BrandFields & {
    status: "active" | "inactive";
    dashboardUrl?: string;
    ctaText?: string;
    note?: string;
    subject?: string;
  },
) {
  const { settings, primary, brandName } = await baseBrand(props);
  const recipient = resolveBusinessRecipient(props.businessEmail);
  if (!recipient) {
    console.warn(
      "[email] skip business_status: no business email and no ADMIN_EMAIL fallback",
    );
    return null;
  }
  const subject =
    props.subject?.trim() ??
    (props.status === "active"
      ? `${brandName} is active`
      : `${brandName} is inactive`);
  return sendAppEmail({
    to: recipient,
    subject,
    businessEmail: props.businessEmail,
    businessDisplayName: brandName,
    templateType: "business_status",
    dedupeKey: props.dedupeKey,
    react: createElement(BusinessStatusEmail, {
      oneCoreLogoUrl: settings.brandingLogoUrl,
      clientBrandLogoUrl: props.clientLogoUrl,
      primaryColor: primary,
      ownerFullName: props.ownerFullName,
      brandName,
      footerCopyrightYear: settings.copyrightYear,
      status: props.status,
      dashboardUrl: props.dashboardUrl,
      ctaText: props.ctaText,
      note: props.note,
    }),
  });
}
