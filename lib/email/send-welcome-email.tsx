import { WelcomeEmail } from "@/emails/templates/WelcomeEmail";
import type { QrImageAsset } from "@/emails/types";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { emailFlowWarn } from "@/lib/email/email-flow-log";
import { resolveBusinessRecipient } from "@/lib/email/resolve-recipient";
import { sanitizePrimaryColor } from "@/lib/email/sanitize-primary-color";
import { sendAppEmail } from "@/lib/email/send-app-email";

export type SendWelcomeEmailInput = {
  /** For server logs only (e.g. business UUID). */
  businessId?: string;
  dedupeKey?: string;
  subject?: string;
  ownerFullName: string;
  brandName: string;
  businessEmail: string | null;
  clientLogoUrl: string | null;
  primaryColor: string | null;
  reviewPageUrl: string;
  qrImages: QrImageAsset[];
  previewText?: string;
  greeting?: string;
  title?: string;
  extraMessage?: string;
};

export async function sendWelcomeEmail(input: SendWelcomeEmailInput) {
  const recipient = resolveBusinessRecipient(input.businessEmail);
  if (!recipient) {
    emailFlowWarn("send_skipped_no_recipient", {
      eventTrigger: "welcome",
      templateType: "welcome",
      businessEmail: input.businessEmail,
      correlationId: input.businessId ?? null,
      reason: "No business email and no ADMIN_EMAIL fallback",
    });
    return null;
  }

  const settings = await getAppSettingsPublic();
  const primary = sanitizePrimaryColor(input.primaryColor);
  const year = settings.copyrightYear;

  const brandName = input.brandName.trim() || "Your business";
  const subject = input.subject?.trim() || `Welcome to ${brandName} on One Core App`;

  return sendAppEmail({
    to: recipient,
    subject,
    templateType: "welcome",
    eventTrigger: "welcome",
    dedupeKey: input.dedupeKey,
    correlationId: input.businessId,
    react: (
      <WelcomeEmail
        oneCoreLogoUrl={settings.brandingLogoUrl}
        clientBrandLogoUrl={input.clientLogoUrl}
        primaryColor={primary}
        ownerFullName={input.ownerFullName}
        brandName={brandName}
        footerCopyrightYear={year}
        reviewPageUrl={input.reviewPageUrl}
        qrImages={input.qrImages}
        qrSectionHeading={
          input.qrImages.length > 0 ? `${brandName} — Master QR` : undefined
        }
        qrSectionHint={
          input.qrImages.length > 0
            ? "Scan this QR to open your review page."
            : undefined
        }
        previewText={input.previewText}
        greeting={input.greeting}
        title={input.title}
        extraMessage={input.extraMessage}
      />
    ),
  });
}
