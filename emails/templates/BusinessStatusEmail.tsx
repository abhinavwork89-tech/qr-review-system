import { Text } from "@react-email/components";
import { MasterEmailLayout } from "@/emails/MasterEmailLayout";
import type { EmailBrandContext } from "@/emails/types";

export type BusinessStatusEmailProps = EmailBrandContext & {
  previewText?: string;
  status: "active" | "inactive";
  dashboardUrl?: string;
  ctaText?: string;
  title?: string;
  greeting?: string;
  note?: string;
};

export function BusinessStatusEmail({
  previewText,
  status,
  dashboardUrl,
  ctaText,
  title,
  greeting,
  note,
  ...brand
}: BusinessStatusEmailProps) {
  const displayBrand = brand.brandName.trim() || "your business";
  const owner = brand.ownerFullName.trim() || "there";
  const isActive = status === "active";
  const showCta = Boolean(dashboardUrl?.trim());

  return (
    <MasterEmailLayout
      {...brand}
      previewText={
        previewText ??
        (isActive
          ? `${displayBrand} is active`
          : `${displayBrand} is inactive`)
      }
      title={
        title ??
        (isActive
          ? `${displayBrand} is active`
          : `${displayBrand} is currently inactive`)
      }
      greeting={
        greeting ??
        (isActive
          ? `Hi ${owner}, ${displayBrand} is now marked active in One Core App.`
          : `Hi ${owner}, ${displayBrand} has been marked inactive in One Core App.`)
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
            {isActive
              ? `Customers can reach your review page and QR destinations again. It is a good moment to spot-check links and printed materials for ${displayBrand}.`
              : `While inactive, customers may see an unavailable state when scanning your QR codes or visiting your review entry points. Reactivate ${displayBrand} when you are ready to resume collecting feedback.`}
          </Text>
          {note?.trim() ? (
            <Text
              style={{
                margin: "0 0 12px",
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#18181b",
              }}
            >
              {note.trim()}
            </Text>
          ) : null}
          <Text
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
            }}
          >
            {`If this change was unexpected, ${owner}, sign in and review your business settings or contact support.`}
          </Text>
        </>
      }
      ctaText={showCta ? ctaText ?? "Open dashboard" : undefined}
      ctaUrl={showCta ? dashboardUrl : undefined}
    />
  );
}
