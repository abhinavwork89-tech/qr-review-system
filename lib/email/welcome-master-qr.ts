import type { QrImageAsset } from "@/emails/types";
import { resolveEmailPublicAppOrigin } from "@/lib/public-app-origin";
import { renderBrandedQrPngBuffer } from "@/lib/qr/render-branded-qr-png-buffer";
import { normalizeMasterQrPayloadUrl } from "@/lib/qr/qr-urls";
import { buildMasterQrAbsoluteUrl } from "@/lib/scan/master-qr-target";

const WELCOME_QR_CID = "welcome-master-qr";

export type WelcomeEmailQrAttachment = {
  filename: string;
  content: string;
  content_id: string;
};

export type WelcomeMasterQrInput = {
  businessId: string;
  brandName: string;
  logoUrl?: string | null;
};

/**
 * Welcome email: inline PNG QR encoding the permanent master QR URL `/m/{businessId}`.
 */
export async function buildWelcomeEmailMasterQrContext(
  input: WelcomeMasterQrInput,
): Promise<{
  qrImages: QrImageAsset[];
  qrAttachments: WelcomeEmailQrAttachment[];
  debug: {
    masterQrPayload: string;
    finalQrImageUrl: string | null;
  };
}> {
  const origin = resolveEmailPublicAppOrigin().replace(/\/+$/, "");
  const payload = normalizeMasterQrPayloadUrl(
    buildMasterQrAbsoluteUrl(origin, input.businessId),
    input.businessId,
    origin,
  );
  const brandLabel = input.brandName.trim() || "Your business";

  const empty = {
    qrImages: [] as QrImageAsset[],
    qrAttachments: [] as WelcomeEmailQrAttachment[],
    debug: { masterQrPayload: payload, finalQrImageUrl: null },
  };

  const png = await renderBrandedQrPngBuffer(payload, { logoUrl: input.logoUrl });
  if (!png) {
    return empty;
  }

  return {
    qrImages: [],
    qrAttachments: [
      {
        filename: "master-qr.png",
        content: png.toString("base64"),
        content_id: WELCOME_QR_CID,
      },
    ],
    debug: {
      masterQrPayload: payload,
      finalQrImageUrl: `cid:${WELCOME_QR_CID}`,
    },
  };
}
