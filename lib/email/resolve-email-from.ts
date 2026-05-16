import { emailFlowWarn } from "@/lib/email/email-flow-log";

/** Verified domain default — must match Resend domain verification. */
const DEFAULT_VERIFIED_FROM_EMAIL = "team@team.onecoreapp.com";

const DEFAULT_VERIFIED_FROM_NAME = "One Core App Team";

function sanitizeEnvEmail(email: string): string {
  if (/@gmail\.com$/i.test(email)) {
    emailFlowWarn("resend_from_env_rejected_gmail", {
      fallbackTo: DEFAULT_VERIFIED_FROM_EMAIL,
    });
    return DEFAULT_VERIFIED_FROM_EMAIL;
  }
  return email;
}

/**
 * Platform transactional From — always the verified Resend mailbox.
 * Never use business or user addresses as `from` (Resend requires a verified sender).
 *
 * Override via `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` only for ops (same verified domain).
 */
export function resolveEmailFrom(): string {
  const rawEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_VERIFIED_FROM_EMAIL;
  const email = sanitizeEnvEmail(rawEmail);
  const name =
    process.env.RESEND_FROM_NAME?.trim() || DEFAULT_VERIFIED_FROM_NAME;
  return `${name} <${email}>`;
}
