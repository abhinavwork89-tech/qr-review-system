import type { QrImageAsset } from "@/emails/types";
import {
  emailFlowErrorWithCause,
  emailFlowInfo,
  emailFlowWarn,
} from "@/lib/email/email-flow-log";
import { resolveEmailPublicAppOrigin } from "@/lib/public-app-origin";
import { renderBrandedQrPngBuffer } from "@/lib/qr/render-branded-qr-png-buffer";
import {
  QR_PNG_PRINT_OPTIONS,
  renderQrPngBuffer,
} from "@/lib/qr/render-qr-png-buffer";
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

export type WelcomeQrResolutionTier = "branded" | "simple" | "none";

function emptyWelcomeQrContext(
  payload: string,
  tier: WelcomeQrResolutionTier = "none",
): {
  qrImages: QrImageAsset[];
  qrAttachments: WelcomeEmailQrAttachment[];
  debug: {
    masterQrPayload: string;
    finalQrImageUrl: string | null;
    tier: WelcomeQrResolutionTier;
  };
} {
  return {
    qrImages: [],
    qrAttachments: [],
    debug: { masterQrPayload: payload, finalQrImageUrl: null, tier },
  };
}

function attachmentFromPng(
  png: Buffer,
  tier: Exclude<WelcomeQrResolutionTier, "none">,
): {
  qrAttachments: WelcomeEmailQrAttachment[];
  debug: { finalQrImageUrl: string; tier: WelcomeQrResolutionTier };
} {
  return {
    qrAttachments: [
      {
        filename: "master-qr.png",
        content: png.toString("base64"),
        content_id: WELCOME_QR_CID,
      },
    ],
    debug: {
      finalQrImageUrl: `cid:${WELCOME_QR_CID}`,
      tier,
    },
  };
}

/**
 * Welcome email QR: branded PNG → simple PNG → none (email still sends without attachment).
 */
export async function buildWelcomeEmailMasterQrContext(
  input: WelcomeMasterQrInput,
): Promise<{
  qrImages: QrImageAsset[];
  qrAttachments: WelcomeEmailQrAttachment[];
  debug: {
    masterQrPayload: string;
    finalQrImageUrl: string | null;
    tier: WelcomeQrResolutionTier;
  };
}> {
  emailFlowInfo("welcome_qr_build_start", {
    eventTrigger: "welcome",
    correlationId: input.businessId,
    hasLogoUrl: Boolean(input.logoUrl?.trim()),
  });

  let origin: string;
  let payload: string;

  try {
    origin = resolveEmailPublicAppOrigin().replace(/\/+$/, "");
    payload = normalizeMasterQrPayloadUrl(
      buildMasterQrAbsoluteUrl(origin, input.businessId),
      input.businessId,
      origin,
    );
  } catch (err) {
    emailFlowErrorWithCause(
      "welcome_qr_origin_failed",
      { eventTrigger: "welcome", correlationId: input.businessId },
      err,
    );
    return emptyWelcomeQrContext("", "none");
  }

  emailFlowInfo("welcome_qr_payload_resolved", {
    eventTrigger: "welcome",
    correlationId: input.businessId,
    masterQrPayload: payload,
    origin,
  });

  emailFlowInfo("welcome_qr_branded_start", {
    eventTrigger: "welcome",
    correlationId: input.businessId,
  });

  try {
    const branded = await renderBrandedQrPngBuffer(payload, { logoUrl: input.logoUrl });
    if (branded && branded.length > 0) {
      const built = attachmentFromPng(branded, "branded");
      emailFlowInfo("welcome_qr_branded_success", {
        eventTrigger: "welcome",
        correlationId: input.businessId,
        pngBytes: branded.length,
        tier: "branded",
      });
      return {
        qrImages: [],
        qrAttachments: built.qrAttachments,
        debug: {
          masterQrPayload: payload,
          finalQrImageUrl: built.debug.finalQrImageUrl,
          tier: "branded",
        },
      };
    }
    emailFlowWarn("welcome_qr_branded_empty", {
      eventTrigger: "welcome",
      correlationId: input.businessId,
      reason: "renderBrandedQrPngBuffer returned null or empty buffer",
    });
  } catch (err) {
    emailFlowErrorWithCause(
      "welcome_qr_branded_failed",
      { eventTrigger: "welcome", correlationId: input.businessId },
      err,
    );
  }

  emailFlowInfo("welcome_qr_simple_start", {
    eventTrigger: "welcome",
    correlationId: input.businessId,
  });

  try {
    const simple = await renderQrPngBuffer(payload, QR_PNG_PRINT_OPTIONS);
    if (simple && simple.length > 0) {
      const built = attachmentFromPng(simple, "simple");
      emailFlowInfo("welcome_qr_simple_success", {
        eventTrigger: "welcome",
        correlationId: input.businessId,
        pngBytes: simple.length,
        tier: "simple",
      });
      return {
        qrImages: [],
        qrAttachments: built.qrAttachments,
        debug: {
          masterQrPayload: payload,
          finalQrImageUrl: built.debug.finalQrImageUrl,
          tier: "simple",
        },
      };
    }
    emailFlowWarn("welcome_qr_simple_empty", {
      eventTrigger: "welcome",
      correlationId: input.businessId,
      reason: "renderQrPngBuffer returned null or empty buffer",
    });
  } catch (err) {
    emailFlowErrorWithCause(
      "welcome_qr_simple_failed",
      { eventTrigger: "welcome", correlationId: input.businessId },
      err,
    );
  }

  emailFlowWarn("welcome_qr_none", {
    eventTrigger: "welcome",
    correlationId: input.businessId,
    reason: "All QR tiers failed; welcome email will send without attachment",
  });

  return emptyWelcomeQrContext(payload, "none");
}
