import { Text } from "@react-email/components";
import { MasterEmailLayout } from "@/emails/MasterEmailLayout";
import type { EmailBrandContext } from "@/emails/types";

export type PlanExpiredEmailProps = EmailBrandContext & {
  previewText?: string;
  planName: string;
  expiredOn?: string;
  renewUrl?: string;
  ctaText?: string;
  title?: string;
  greeting?: string;
};

export function PlanExpiredEmail({
  previewText,
  planName,
  expiredOn,
  renewUrl,
  ctaText,
  title,
  greeting,
  ...brand
}: PlanExpiredEmailProps) {
  const displayBrand = brand.brandName.trim() || "your business";
  const owner = brand.ownerFullName.trim() || "there";
  const when = expiredOn?.trim();
  const showCta = Boolean(renewUrl?.trim());

  return (
    <MasterEmailLayout
      {...brand}
      previewText={previewText ?? `Plan update for ${displayBrand}`}
      title={title ?? "Your plan has expired"}
      greeting={
        greeting ??
        `Hi ${owner}, your ${planName} plan for ${displayBrand} is no longer active.`
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
              ? `Access tied to ${planName} ended on ${when}. Customers may not reach your full review flow until you renew.`
              : `Access tied to ${planName} has ended. Customers may not reach your full review flow until you renew.`}
          </Text>
          <Text
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
            }}
          >
            {`Renew when you are ready so ${displayBrand} can keep collecting feedback without interruption.`}
          </Text>
        </>
      }
      ctaText={showCta ? ctaText ?? "Renew plan" : undefined}
      ctaUrl={showCta ? renewUrl : undefined}
    />
  );
}
