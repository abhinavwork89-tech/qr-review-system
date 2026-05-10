import { render } from "@react-email/render";
import { Resend } from "resend";
import type { ReactElement } from "react";
import {
  markEmailSendSucceeded,
  shouldSuppressDuplicateEmail,
} from "@/lib/email/email-dedupe";
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
  businessEmail?: string | null;
  businessDisplayName?: string | null;
  /** When set, overrides `resolveEmailFrom` result. */
  fromOverride?: string;
  replyTo?: string | string[] | null;
  /** For logs only (e.g. welcome, review_submitted, plan_expired). */
  templateType?: string;
  /** When set, suppress repeat sends within a short TTL after a successful send. */
  dedupeKey?: string;
};

function resendErrorHint(message: string): string | undefined {
  if (/domain|verify|verified|not allowed|invalid.*from/i.test(message)) {
    return "Resend rejected the send: use a verified domain for `from`, or a Resend-allowed `RESEND_FROM_EMAIL` in sandbox.";
  }
  return undefined;
}

export async function sendAppEmail(params: SendAppEmailParams) {
  const toList = Array.isArray(params.to) ? params.to : [params.to];
  const template = params.templateType ?? "unspecified";

  if (params.dedupeKey && shouldSuppressDuplicateEmail(params.dedupeKey)) {
    console.info(
      "[email] duplicate suppressed",
      JSON.stringify({ template, dedupeKey: params.dedupeKey, recipient: toList }),
    );
    return null;
  }

  const resend = getResendClient();
  const from =
    params.fromOverride?.trim() ||
    resolveEmailFrom({
      businessEmail: params.businessEmail,
      businessDisplayName: params.businessDisplayName,
    });

  console.info(
    "[email] outbound",
    JSON.stringify({
      template,
      from,
      recipient: toList,
    }),
  );

  const text = await render(params.react, { plainText: true });

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    react: params.react,
    text,
    ...(params.replyTo
      ? { replyTo: params.replyTo }
      : {}),
  });

  if (error) {
    const message = error.message || "Failed to send email";
    const hint = resendErrorHint(message);
    console.error(
      "[email] failure",
      JSON.stringify({
        template,
        from,
        recipient: toList,
        message,
        ...(hint ? { hint } : {}),
      }),
    );
    throw new Error(message);
  }

  if (params.dedupeKey) {
    markEmailSendSucceeded(params.dedupeKey);
  }
  console.info(
    "[email] success",
    JSON.stringify({
      template,
      recipient: toList,
      id: data?.id,
    }),
  );
  return data;
}
