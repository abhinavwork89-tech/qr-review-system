import type { QrImageAsset } from "@/emails/types";
import { getPublicAppOrigin } from "@/lib/email/app-public-url";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { computeMasterQrScanFields } from "@/lib/review/display-model";
import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import type { MasterQrType } from "@/lib/scan/master-qr";

const MAX_QR_PAYLOAD_LEN = 3200;

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

function safeGoogleReviewUrl(google_url: string | null): string | null {
  const u = (google_url ?? "").trim();
  return u.length > 0 && isSafeHttpUrl(u) ? u : null;
}

function buildQrPngProxyUrl(appOrigin: string, payloadUrl: string): string | null {
  try {
    const base = appOrigin.trim().replace(/\/+$/, "");
    const u = new URL(`${base}/api/qr-png`);
    u.searchParams.set("payload", payloadUrl);
    if (u.href.length > 8000) return null;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Welcome email: single master QR image (tracked `/api/scan/out` when possible).
 * Never uses `resource_urls` / digital assets.
 */
export function buildWelcomeEmailMasterQrContext(input: WelcomeMasterQrInput): {
  qrImages: QrImageAsset[];
  debug: {
    master_qr_type: MasterQrType;
    resolvedScanOutbound: string;
    masterTrackUrl: string;
    finalQrPayload: string;
    finalQrImageUrl: string | null;
    payloadSource: "master_track" | "review_plain" | "google_track" | "none";
  };
} {
  const origin =
    getPublicAppOrigin()?.trim().replace(/\/+$/, "") || "http://localhost:3000";

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

  let payload = scan.masterQrTrackUrl;
  let payloadSource: "master_track" | "review_plain" | "google_track" | "none" =
    "master_track";

  if (!isSafeHttpUrl(payload) || payload.length > MAX_QR_PAYLOAD_LEN) {
    payload = `${origin}/r/${input.slug.trim()}`;
    payloadSource = "review_plain";
  }

  if (!isSafeHttpUrl(payload) || payload.length > MAX_QR_PAYLOAD_LEN) {
    const g = safeGoogleReviewUrl(input.google_url);
    if (g) {
      payload = buildTrackedScanOutUrl(input.businessId, "google", g, origin);
      payloadSource = "google_track";
    }
  }

  if (!isSafeHttpUrl(payload) || payload.length > MAX_QR_PAYLOAD_LEN) {
    return {
      qrImages: [],
      debug: {
        master_qr_type: scan.effectiveMasterType,
        resolvedScanOutbound: scan.masterOutboundUrl,
        masterTrackUrl: scan.masterQrTrackUrl,
        finalQrPayload: "",
        finalQrImageUrl: null,
        payloadSource: "none",
      },
    };
  }

  const finalQrImageUrl = buildQrPngProxyUrl(origin, payload);
  if (!finalQrImageUrl) {
    return {
      qrImages: [],
      debug: {
        master_qr_type: scan.effectiveMasterType,
        resolvedScanOutbound: scan.masterOutboundUrl,
        masterTrackUrl: scan.masterQrTrackUrl,
        finalQrPayload: payload,
        finalQrImageUrl: null,
        payloadSource,
      },
    };
  }

  return {
    qrImages: [
      {
        src: finalQrImageUrl,
        alt: `Master QR — ${brandLabel}`,
      },
    ],
    debug: {
      master_qr_type: scan.effectiveMasterType,
      resolvedScanOutbound: scan.masterOutboundUrl,
      masterTrackUrl: scan.masterQrTrackUrl,
      finalQrPayload: payload,
      finalQrImageUrl,
      payloadSource,
    },
  };
}
