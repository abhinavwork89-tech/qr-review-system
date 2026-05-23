import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { MasterEmailLayoutProps } from "@/emails/types";
import { POPPINS_EMAIL_FONT_FAMILY } from "@/lib/fonts/constants";

const pageBg = "#f4f4f5";
const cardBg = "#ffffff";
const muted = "#71717a";
const bodyText = "#18181b";

export function MasterEmailLayout({
  previewText,
  oneCoreLogoUrl,
  clientBrandLogoUrl,
  primaryColor,
  title,
  greeting,
  mainMessage,
  ctaText,
  ctaUrl,
  qrImages,
  qrSectionHeading,
  qrSectionHint,
  footerCopyrightYear,
}: MasterEmailLayoutProps) {
  const showCta = Boolean(ctaText?.trim() && ctaUrl?.trim());
  const hasInlineQr = Boolean(qrImages && qrImages.length > 0);
  const hasQrHint = Boolean(qrSectionHint?.trim());
  const showQr = hasInlineQr || hasQrHint;
  const qrHeading =
    (qrSectionHeading?.trim() || "").length > 0
      ? qrSectionHeading!.trim()
      : "Your QR code";

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/poppins/v22/pxiEyp8kv8JHgFVrJJfecg.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/poppins/v22/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2",
            format: "woff2",
          }}
          fontWeight={600}
          fontStyle="normal"
        />
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/poppins/v22/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2",
            format: "woff2",
          }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>
      {previewText ? <Preview>{previewText}</Preview> : null}
      <Body
        style={{
          margin: 0,
          padding: "24px 12px",
          backgroundColor: pageBg,
          fontFamily: POPPINS_EMAIL_FONT_FAMILY,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: cardBg,
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #e4e4e7",
          }}
        >
          <Section
            style={{
              padding: "20px 28px 12px",
              borderBottom: `3px solid ${primaryColor}`,
            }}
          >
            {oneCoreLogoUrl ? (
              <Img
                src={oneCoreLogoUrl}
                alt="One Core App"
                height={28}
                style={{ display: "block", marginBottom: "16px" }}
              />
            ) : (
              <Text
                style={{
                  margin: "0 0 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: primaryColor,
                  letterSpacing: "0.02em",
                }}
              >
                One Core App
              </Text>
            )}
            {clientBrandLogoUrl ? (
              <Img
                src={clientBrandLogoUrl}
                alt=""
                width={160}
                style={{ display: "block", margin: "0 auto" }}
              />
            ) : null}
          </Section>

          <Section style={{ padding: "28px 28px 8px" }}>
            <Heading
              as="h1"
              style={{
                margin: "0 0 8px",
                fontSize: "22px",
                lineHeight: "1.3",
                color: bodyText,
                fontWeight: 700,
              }}
            >
              {title}
            </Heading>
            <Text
              style={{
                margin: "0 0 20px",
                fontSize: "16px",
                lineHeight: "1.55",
                color: primaryColor,
                fontWeight: 600,
              }}
            >
              {greeting}
            </Text>

            <Section
              style={{
                padding: "20px 18px",
                backgroundColor: "#fafafa",
                borderRadius: "10px",
                borderLeft: `4px solid ${primaryColor}`,
              }}
            >
              {mainMessage}
            </Section>

            {showQr ? (
              <Section style={{ marginTop: "24px" }}>
                <Text
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: primaryColor,
                  }}
                >
                  {qrHeading}
                </Text>
                {hasQrHint ? (
                  <Text
                    style={{
                      margin: hasInlineQr ? "0 0 14px" : "0",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: bodyText,
                    }}
                  >
                    {qrSectionHint!.trim()}
                  </Text>
                ) : null}
                {hasInlineQr
                  ? qrImages!.map((img, idx) => (
                      <Section key={idx} style={{ marginTop: "14px", marginBottom: "16px" }}>
                        <Img
                          src={img.src}
                          alt={img.alt}
                          width={200}
                          style={{
                            display: "block",
                            width: "200px",
                            height: "auto",
                            maxWidth: "200px",
                            maxHeight: "220px",
                            objectFit: "contain",
                            borderRadius: "8px",
                            border: "1px solid #e4e4e7",
                          }}
                        />
                      </Section>
                    ))
                  : null}
              </Section>
            ) : null}

            {showCta ? (
              <Section style={{ marginTop: "28px", textAlign: "center" }}>
                <Button
                  href={ctaUrl!}
                  style={{
                    backgroundColor: primaryColor,
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "12px 28px",
                    fontSize: "15px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  {ctaText}
                </Button>
              </Section>
            ) : null}
          </Section>

          <Hr style={{ borderColor: "#e4e4e7", margin: "0 28px" }} />

          <Section style={{ padding: "20px 28px 28px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "1.5",
                color: muted,
                textAlign: "center",
              }}
            >
              {`Made with ❤️ by One Core App © ${footerCopyrightYear}. All rights reserved.`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
