import { Link, Text } from "@react-email/components";
import { MasterEmailLayout } from "@/emails/MasterEmailLayout";
import type { EmailBrandContext } from "@/emails/types";

const SUPPORT_EMAIL = "team@onecoreapp.com";

export type BusinessStatusEmailProps = EmailBrandContext & {
  previewText?: string;
  status: "active" | "inactive";
  title?: string;
  greeting?: string;
  note?: string;
};

function SupportLine({ primaryColor }: { primaryColor: string }) {
  return (
    <Text
      style={{
        margin: 0,
        fontSize: "15px",
        lineHeight: "1.65",
        color: "#18181b",
      }}
    >
      {"If you need anything, email us at "}
      <Link
        href={`mailto:${SUPPORT_EMAIL}`}
        style={{ color: primaryColor, textDecoration: "underline" }}
      >
        {SUPPORT_EMAIL}
      </Link>
      {" — we're here to help."}
    </Text>
  );
}

export function BusinessStatusEmail({
  previewText,
  status,
  title,
  greeting,
  note,
  ...brand
}: BusinessStatusEmailProps) {
  const displayBrand = brand.brandName.trim() || "your business";
  const owner = brand.ownerFullName.trim() || "there";
  const isActive = status === "active";

  return (
    <MasterEmailLayout
      {...brand}
      previewText={
        previewText ??
        (isActive
          ? `Good news — ${displayBrand} is active again`
          : `We're here when you're ready — ${displayBrand}`)
      }
      title={
        title ??
        (isActive ? "Welcome back!" : "We're here for you")
      }
      greeting={
        greeting ??
        (isActive
          ? `Hi ${owner}, we're happy to have you with us again.`
          : `Hi ${owner}, we're sorry to see that ${displayBrand} is currently inactive.`)
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
              ? `Your review page and QR codes are active now. Customers can scan your QR and leave reviews just like before.`
              : `Your review page and QR codes are on pause for now. When you're ready to come back, we'd love to help you get started again.`}
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
          {isActive ? (
            <Text
              style={{
                margin: "0 0 12px",
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#18181b",
              }}
            >
              Thank you for continuing with One Core App.
            </Text>
          ) : (
            <Text
              style={{
                margin: "0 0 12px",
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#18181b",
              }}
            >
              We would love to help you reconnect whenever the time is right.
            </Text>
          )}
          <SupportLine primaryColor={brand.primaryColor} />
        </>
      }
    />
  );
}
