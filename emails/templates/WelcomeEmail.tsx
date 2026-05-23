import { Text } from "@react-email/components";
import { MasterEmailLayout } from "@/emails/MasterEmailLayout";
import type { EmailBrandContext, QrImageAsset } from "@/emails/types";

export type WelcomeEmailProps = EmailBrandContext & {
  previewText?: string;
  reviewPageUrl: string;
  qrImages: QrImageAsset[];
  /** Overrides default "Your QR codes" when master QR is shown. */
  qrSectionHeading?: string;
  qrSectionHint?: string;
  /** Overrides default onboarding copy when provided. */
  greeting?: string;
  title?: string;
  extraMessage?: string;
};

export function WelcomeEmail({
  previewText,
  reviewPageUrl,
  qrImages,
  qrSectionHeading,
  qrSectionHint,
  greeting,
  title,
  extraMessage,
  ...brand
}: WelcomeEmailProps) {
  const displayBrand = brand.brandName.trim() || "your business";
  const owner = brand.ownerFullName.trim() || "there";
  const defaultGreeting = `Welcome aboard, ${owner} — ${displayBrand} is live on One Core App.`;
  const defaultTitle = `You are ready to collect reviews`;

  return (
    <MasterEmailLayout
      {...brand}
      previewText={previewText ?? `Welcome to ${displayBrand}`}
      title={title ?? defaultTitle}
      greeting={greeting ?? defaultGreeting}
      mainMessage={
        <>
          <Text
            style={{
              margin: "0 0 12px",
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
            }}
          >
            {`We are thrilled to have ${displayBrand} on board. Your review experience is configured — use the attached Master QR for print and signage, or share your review page link in campaigns.`}
          </Text>
          <Text
            style={{
              margin: "0 0 12px",
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
            }}
          >
            {`Tip for ${owner}: bookmark your review page so you can share it in campaigns, receipts, and table tents alongside your printed Master QR.`}
          </Text>
          {extraMessage ? (
            <Text
              style={{
                margin: 0,
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#18181b",
              }}
            >
              {extraMessage}
            </Text>
          ) : null}
        </>
      }
      ctaText="Open Your Review Page"
      ctaUrl={reviewPageUrl}
      qrImages={qrImages}
      qrSectionHeading={qrSectionHeading}
      qrSectionHint={qrSectionHint}
    />
  );
}
