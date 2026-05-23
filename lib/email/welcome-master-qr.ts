import type { QrImageAsset } from "@/emails/types";
import { resolveEmailPublicAppOrigin } from "@/lib/public-app-origin";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { computeMasterQrScanFields } from "@/lib/review/display-model";
import { renderQrPngBuffer } from "@/lib/qr/render-qr-png-buffer";
import type { MasterQrType } from "@/lib/scan/master-qr";

const MAX_QR_PAYLOAD_LEN = 3200;
const WELCOME_QR_CID = "welcome-master-qr";

export type WelcomeEmailQrAttachment = {
  filename: string;
  content: string;
  content_id: string;
};

export type WelcomeMasterQrInput = {
  businessId: string;
  slug: string;
  brandName: string;
  google_url: string | null;
  channels: unknown;
  whatsapp_country_code: string | null;
  whatsapp_number: string | null;
  master_qr_type: string | null;
};

/**
 * Welcome email: inline PNG QR (CID attachment) encoding the public review page URL.
 * Never uses `resource_urls` / digital assets or remote `/api/qr-png` fetches in `<img src>`.
 */
export async function buildWelcomeEmailMasterQrContext(
  input: WelcomeMasterQrInput,
): Promise<{
  qrImages: QrImageAsset[];
  qrAttachments: WelcomeEmailQrAttachment[];
  debug: {
    master_qr_type: MasterQrType;
    resolvedScanOutbound: string;
    masterTrackUrl: string;
    finalQrPayload: string;
    finalQrImageUrl: string | null;
    payloadSource: "review_plain";
  };
}> {
  const origin = resolveEmailPublicAppOrigin().replace(/\/+$/, "");

  const scan = computeMasterQrScanFields(
    {
      id: input.businessId,
      slug: input.slug,
      google_url: input.google_url,
      channels: input.channels,
      whatsapp_country_code: input.whatsapp_country_code,
      whatsapp_number: input.whatsapp_number,
      master_qr_type: input.master_qr_type,
    },
    origin,
  );

  const brandLabel = input.brandName.trim() || "Your business";
  const payload = scan.reviewPageUrl;
  const payloadSource = "review_plain" as const;

  const emptyDebug = {
    master_qr_type: scan.effectiveMasterType,
    resolvedScanOutbound: scan.masterOutboundUrl,
    masterTrackUrl: scan.masterQrTrackUrl,
    finalQrPayload: "",
    finalQrImageUrl: null,
    payloadSource,
  };

  if (!isSafeHttpUrl(payload) || payload.length > MAX_QR_PAYLOAD_LEN) {
    return { qrImages: [], qrAttachments: [], debug: emptyDebug };
  }

  const png = await renderQrPngBuffer(payload);
  if (!png) {
    return {
      qrImages: [],
      qrAttachments: [],
      debug: { ...emptyDebug, finalQrPayload: payload },
    };
  }

  return {
    qrImages: [
      {
        src: `cid:${WELCOME_QR_CID}`,
        alt: `Review QR — ${brandLabel}`,
      },
    ],
    qrAttachments: [
      {
        filename: "master-qr.png",
        content: png.toString("base64"),
        content_id: WELCOME_QR_CID,
      },
    ],
    debug: {
      master_qr_type: scan.effectiveMasterType,
      resolvedScanOutbound: scan.masterOutboundUrl,
      masterTrackUrl: scan.masterQrTrackUrl,
      finalQrPayload: payload,
      finalQrImageUrl: `cid:${WELCOME_QR_CID}`,
      payloadSource,
    },
  };
}
