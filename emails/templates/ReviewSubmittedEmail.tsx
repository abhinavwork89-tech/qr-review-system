import { Text } from "@react-email/components";
import { MasterEmailLayout } from "@/emails/MasterEmailLayout";
import type { EmailBrandContext } from "@/emails/types";

export type ReviewCustomerDetails = {
  name: string;
  email: string;
  mobile: string;
};

export type ReviewSubmittedEmailProps = EmailBrandContext & {
  previewText?: string;
  rating: number;
  reviewMessage: string;
  customer: ReviewCustomerDetails;
  title?: string;
  greeting?: string;
};

function ratingLine(rating: number): string {
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  const filled = "★".repeat(r);
  const empty = "☆".repeat(5 - r);
  return `${filled}${empty} (${r} of 5)`;
}

export function ReviewSubmittedEmail({
  previewText,
  rating,
  reviewMessage,
  customer,
  title,
  greeting,
  ...brand
}: ReviewSubmittedEmailProps) {
  const displayBrand = brand.brandName.trim() || "your business";
  const owner = brand.ownerFullName.trim() || "there";

  return (
    <MasterEmailLayout
      {...brand}
      previewText={previewText ?? `New review for ${displayBrand}`}
      title={title ?? "New review submitted"}
      greeting={
        greeting ??
        `Hi ${owner}, someone just left feedback for ${displayBrand}.`
      }
      mainMessage={
        <>
          <Text
            style={{
              margin: "0 0 8px",
              fontSize: "14px",
              fontWeight: 600,
              color: brand.primaryColor,
            }}
          >
            Rating
          </Text>
          <Text
            style={{
              margin: "0 0 20px",
              fontSize: "16px",
              lineHeight: "1.5",
              color: "#18181b",
            }}
          >
            {ratingLine(rating)}
          </Text>
          <Text
            style={{
              margin: "0 0 8px",
              fontSize: "14px",
              fontWeight: 600,
              color: brand.primaryColor,
            }}
          >
            Customer
          </Text>
          <Text
            style={{
              margin: "0 0 4px",
              fontSize: "15px",
              lineHeight: "1.55",
              color: "#18181b",
            }}
          >
            {`Name: ${customer.name || "—"}`}
          </Text>
          <Text
            style={{
              margin: "0 0 4px",
              fontSize: "15px",
              lineHeight: "1.55",
              color: "#18181b",
            }}
          >
            {`Email: ${customer.email || "—"}`}
          </Text>
          <Text
            style={{
              margin: "0 0 20px",
              fontSize: "15px",
              lineHeight: "1.55",
              color: "#18181b",
            }}
          >
            {`Mobile: ${customer.mobile || "—"}`}
          </Text>
          <Text
            style={{
              margin: "0 0 8px",
              fontSize: "14px",
              fontWeight: 600,
              color: brand.primaryColor,
            }}
          >
            Review message
          </Text>
          <Text
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: "1.65",
              color: "#18181b",
              whiteSpace: "pre-wrap",
            }}
          >
            {reviewMessage.trim() ? reviewMessage : "—"}
          </Text>
        </>
      }
    />
  );
}
