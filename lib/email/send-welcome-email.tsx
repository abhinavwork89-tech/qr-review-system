import { WelcomeEmail } from "@/emails/templates/WelcomeEmail";
import type { QrImageAsset } from "@/emails/types";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { resolveBusinessRecipient } from "@/lib/email/resolve-recipient";
import { sanitizePrimaryColor } from "@/lib/email/sanitize-primary-color";
import { sendAppEmail } from "@/lib/email/send-app-email";

export type SendWelcomeEmailInput = {
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
    console.warn(
      "[email] skip welcome: no business email and no ADMIN_EMAIL fallback",
    );
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
    businessEmail: input.businessEmail,
    businessDisplayName: brandName,
    templateType: "welcome",
    dedupeKey: input.dedupeKey,
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
        previewText={input.previewText}
        greeting={input.greeting}
        title={input.title}
        extraMessage={input.extraMessage}
      />
    ),
  });
}
