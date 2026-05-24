import { render } from "@react-email/render";
import { Resend } from "resend";
import type { ReactElement } from "react";
import {
  markEmailSendSucceeded,
  shouldSuppressDuplicateEmail,
} from "@/lib/email/email-dedupe";
import {
  emailFlowError,
  emailFlowErrorWithCause,
  emailFlowInfo,
} from "@/lib/email/email-flow-log";
import { resolveEmailTemplateForEvent } from "@/lib/email/email-template-resolution";
import { resolveEmailFrom } from "@/lib/email/resolve-email-from";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

export type SendAppEmailParams = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string | string[] | null;
  /** Log / dedupe label (e.g. welcome, review_submitted). */
  templateType?: string;
  /**
   * Lifecycle / product event name for logs and template registry.
   * Defaults to `templateType` when omitted.
   */
  eventTrigger?: string;
  /** When set, suppress repeat sends within a short TTL after a successful send. */
  dedupeKey?: string;
  /** Optional id for correlating logs (e.g. business UUID). */
  correlationId?: string;
  /** Inline images (use `cid:` in template `Img` src). */
  attachments?: Array<{
    filename: string;
    content: string;
    content_id?: string;
  }>;
};

function resendErrorHint(message: string): string | undefined {
  if (/domain|verify|verified|not allowed|invalid.*from/i.test(message)) {
    return "Resend rejected the send: `from` must use the verified domain (see RESEND_FROM_EMAIL / RESEND_FROM_NAME).";
  }
  return undefined;
}

function buildPlainTextFallback(params: {
  subject: string;
  eventTrigger: string;
}): string {
  return [
    params.subject,
    "",
    "The rich HTML version of this message could not be generated.",
    `Event: ${params.eventTrigger}`,
    "Please open your One Core App dashboard for the latest updates.",
  ].join("\n");
}

export async function sendAppEmail(params: SendAppEmailParams) {
  const toList = Array.isArray(params.to) ? params.to : [params.to];
  const templateType = params.templateType ?? "unspecified";
  const eventTrigger = params.eventTrigger ?? templateType;

  const templateMeta = await resolveEmailTemplateForEvent(eventTrigger);
  const finalFrom = resolveEmailFrom();

  if (params.dedupeKey && shouldSuppressDuplicateEmail(params.dedupeKey)) {
    emailFlowInfo("send_suppressed_duplicate", {
      eventTrigger,
      templateType,
      templateMeta,
      dedupeKey: params.dedupeKey,
      finalFrom,
      finalTo: toList,
      correlationId: params.correlationId,
    });
    return null;
  }

  let resend: Resend;
  try {
    resend = getResendClient();
  } catch (e) {
    emailFlowErrorWithCause(
      "resend_client_init_failed",
      {
        eventTrigger,
        templateType,
        finalFrom,
        finalTo: toList,
        correlationId: params.correlationId ?? null,
      },
      e,
    );
    throw e;
  }
  const from = finalFrom;
  const finalTo =
    typeof params.to === "string" ? [params.to] : [...params.to];

  emailFlowInfo("send_start", {
    eventTrigger,
    templateType,
    builtinModulePath: templateMeta.builtinModulePath,
    templateSource: templateMeta.templateSource,
    dbTemplateId: templateMeta.dbTemplateId,
    finalFrom: from,
    finalTo,
    replyTo: params.replyTo ?? null,
    subject: params.subject,
    dedupeKey: params.dedupeKey ?? null,
    correlationId: params.correlationId ?? null,
  });

  let plainTextForSend: string;
  let usedRenderFallback = false;

  try {
    plainTextForSend = await render(params.react, { plainText: true });
    emailFlowInfo("template_render_ok", {
      eventTrigger,
      templateType,
      plainTextChars: plainTextForSend.length,
      correlationId: params.correlationId ?? null,
    });
  } catch (renderErr) {
    usedRenderFallback = true;
    emailFlowErrorWithCause("template_render_failed", {
      eventTrigger,
      templateType,
      failureReason: "React Email render threw; sending plain-text fallback.",
      finalTo,
      finalFrom: from,
      correlationId: params.correlationId ?? null,
    }, renderErr);
    plainTextForSend = buildPlainTextFallback({ subject: params.subject, eventTrigger });
  }

  const sendPayload = usedRenderFallback
    ? {
        from,
        to: params.to,
        subject: params.subject,
        text: plainTextForSend,
        ...(params.replyTo ? { replyTo: params.replyTo } : {}),
        ...(params.attachments?.length ? { attachments: params.attachments } : {}),
      }
    : {
        from,
        to: params.to,
        subject: params.subject,
        react: params.react,
        text: plainTextForSend,
        ...(params.replyTo ? { replyTo: params.replyTo } : {}),
        ...(params.attachments?.length ? { attachments: params.attachments } : {}),
      };

  emailFlowInfo("resend_api_call_start", {
    eventTrigger,
    templateType,
    correlationId: params.correlationId ?? null,
    attachmentCount: params.attachments?.length ?? 0,
    usedRenderFallback,
  });

  const { data, error } = await resend.emails.send(
    sendPayload as Parameters<Resend["emails"]["send"]>[0],
  );

  if (error) {
    const message = error.message || "Failed to send email";
    const hint = resendErrorHint(message);
    emailFlowError("resend_send_rejected", {
      eventTrigger,
      templateType,
      finalFrom: from,
      finalTo,
      usedRenderFallback,
      resendError: {
        name: (error as { name?: string }).name,
        message,
        details:
          error && typeof error === "object"
            ? { ...error }
            : { value: String(error) },
      },
      ...(hint ? { hint } : {}),
      correlationId: params.correlationId ?? null,
    });
    throw new Error(message);
  }

  if (params.dedupeKey) {
    markEmailSendSucceeded(params.dedupeKey);
  }

  emailFlowInfo("resend_send_accepted", {
    eventTrigger,
    templateType,
    finalFrom: from,
    finalTo,
    resendResponse: data ?? null,
    usedRenderFallback,
    correlationId: params.correlationId ?? null,
  });

  return data;
}
