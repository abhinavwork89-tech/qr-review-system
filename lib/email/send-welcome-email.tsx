import { WelcomeEmail } from "@/emails/templates/WelcomeEmail";
import type { QrImageAsset } from "@/emails/types";
import type { WelcomeEmailQrAttachment } from "@/lib/email/welcome-master-qr";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { emailFlowInfo, emailFlowWarn } from "@/lib/email/email-flow-log";
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
  qrAttachments?: WelcomeEmailQrAttachment[];
  /** Shown in the email body when a QR PNG is attached (no inline CID image). */
  qrAttachmentHint?: string;
  previewText?: string;
  greeting?: string;
  title?: string;
  extraMessage?: string;
};

export async function sendWelcomeEmail(input: SendWelcomeEmailInput) {
  emailFlowInfo("welcome_email_send_enter", {
    eventTrigger: "welcome",
    correlationId: input.businessId ?? null,
    attachmentCount: input.qrAttachments?.length ?? 0,
    businessEmailPresent: Boolean(input.businessEmail?.trim()),
  });

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
  const subject = input.subject?.trim() || `Welcome to One Core App, ${brandName}!`;

  return sendAppEmail({
    to: recipient,
    subject,
    templateType: "welcome",
    eventTrigger: "welcome",
    dedupeKey: input.dedupeKey,
    correlationId: input.businessId,
    attachments: input.qrAttachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      content_id: a.content_id,
    })),
    react: (
      <WelcomeEmail
        oneCoreLogoUrl={settings.brandingLogoUrl}
        clientBrandLogoUrl={input.clientLogoUrl}
        primaryColor={primary}
        ownerFullName={input.ownerFullName}
        brandName={brandName}
        footerCopyrightYear={year}
        reviewPageUrl={input.reviewPageUrl}
        qrImages={[]}
        qrSectionHeading={
          input.qrAttachments && input.qrAttachments.length > 0
            ? `${brandName} — Master QR`
            : undefined
        }
        qrSectionHint={
          input.qrAttachments && input.qrAttachments.length > 0
            ? (input.qrAttachmentHint?.trim() ||
              "Your Master QR is attached to this email. Open the file to print it on table tents, stickers, or signage.")
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
