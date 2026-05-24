import { Link, Text } from "@react-email/components";
import { MasterEmailLayout } from "@/emails/MasterEmailLayout";
import type { EmailBrandContext, QrImageAsset } from "@/emails/types";

const SUPPORT_EMAIL = "team@onecoreapp.com";

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
  const defaultGreeting = `Hi ${owner}, welcome to One Core App — we're excited to have ${displayBrand} on board.`;
  const defaultTitle = "You're all set!";

  return (
    <MasterEmailLayout
      {...brand}
      previewText={previewText ?? `Welcome to One Core App, ${displayBrand}!`}
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
            {`Your review system is ready to go. Your Master QR is attached to this email — print it for your store, menus, or signage.`}
          </Text>
          <Text
            style={{
              margin: "0 0 12px",
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
            }}
          >
            {`You can also share your review page link anytime. We're cheering you on as you start collecting great feedback.`}
          </Text>
          <Text
            style={{
              margin: extraMessage ? "0 0 12px" : 0,
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
            }}
          >
            {"Questions? Email us anytime at "}
            <Link
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: brand.primaryColor, textDecoration: "underline" }}
            >
              {SUPPORT_EMAIL}
            </Link>
            {" — we're happy to help."}
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
