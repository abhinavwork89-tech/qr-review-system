import { Text } from "@react-email/components";
import { MasterEmailLayout } from "@/emails/MasterEmailLayout";
import type { EmailBrandContext } from "@/emails/types";

export type PlanRenewedEmailProps = EmailBrandContext & {
  previewText?: string;
  planName: string;
  renewedOn?: string;
  dashboardUrl?: string;
  ctaText?: string;
  title?: string;
  greeting?: string;
};

export function PlanRenewedEmail({
  previewText,
  planName,
  renewedOn,
  dashboardUrl,
  ctaText,
  title,
  greeting,
  ...brand
}: PlanRenewedEmailProps) {
  const displayBrand = brand.brandName.trim() || "your business";
  const owner = brand.ownerFullName.trim() || "there";
  const when = renewedOn?.trim();
  const showCta = Boolean(dashboardUrl?.trim());

  return (
    <MasterEmailLayout
      {...brand}
      previewText={previewText ?? `${displayBrand} plan renewed`}
      title={title ?? "Plan renewed — thank you"}
      greeting={
        greeting ??
        `Great news, ${owner}: ${displayBrand}'s ${planName} plan is active again.`
      }
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
            {when
              ? `We confirmed your renewal on ${when}. Your review links and QR experiences should behave as expected for customers.`
              : `We confirmed your renewal. Your review links and QR experiences should behave as expected for customers.`}
          </Text>
          <Text
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
            }}
          >
            {`If anything looks off inside ${displayBrand}, open your dashboard and run a quick test review.`}
          </Text>
        </>
      }
      ctaText={showCta ? ctaText ?? "Open dashboard" : undefined}
      ctaUrl={showCta ? dashboardUrl : undefined}
    />
  );
}
