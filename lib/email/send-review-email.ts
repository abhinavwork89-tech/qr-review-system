import { createElement } from "react";
import { ReviewSubmittedEmail } from "@/emails/templates/ReviewSubmittedEmail";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { emailFlowWarn } from "@/lib/email/email-flow-log";
import { resolveBusinessRecipient } from "@/lib/email/resolve-recipient";
import { sanitizePrimaryColor } from "@/lib/email/sanitize-primary-color";
import { sendAppEmail } from "@/lib/email/send-app-email";

export type SendReviewEmailInput = {
  rating: number;
  review_text: string;
  name: string;
  email: string;
  mobile: string;
};

export type SendReviewEmailBranding = {
  ownerFullName: string;
  brandName: string;
  businessEmail: string | null;
  clientLogoUrl: string | null;
  primaryColor: string | null;
};

export async function sendReviewEmail(
  data: SendReviewEmailInput,
  branding: SendReviewEmailBranding,
  options?: { dedupeKey?: string; correlationId?: string },
) {
  const recipient = resolveBusinessRecipient(branding.businessEmail);
  if (!recipient) {
    emailFlowWarn("send_skipped_no_recipient", {
      eventTrigger: "review_submitted",
      templateType: "review_submitted",
      businessEmail: branding.businessEmail,
      correlationId: options?.correlationId ?? null,
      reason: "No business email and no ADMIN_EMAIL fallback",
    });
    return null;
  }

  const settings = await getAppSettingsPublic();
  const primary = sanitizePrimaryColor(branding.primaryColor);
  const brandLabel = branding.brandName.trim() || "Your business";
  const owner = branding.ownerFullName.trim() || "there";

  const subject = `New review — ${brandLabel}`;

  return sendAppEmail({
    to: recipient,
    subject,
    replyTo: data.email?.trim() || undefined,
    templateType: "review_submitted",
    eventTrigger: "review_submitted",
    dedupeKey: options?.dedupeKey,
    correlationId: options?.correlationId,
    react: createElement(ReviewSubmittedEmail, {
      oneCoreLogoUrl: settings.brandingLogoUrl,
      clientBrandLogoUrl: branding.clientLogoUrl,
      primaryColor: primary,
      ownerFullName: owner,
      brandName: brandLabel,
      footerCopyrightYear: settings.copyrightYear,
      rating: data.rating,
      reviewMessage: data.review_text,
      customer: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
      },
    }),
  });
}
