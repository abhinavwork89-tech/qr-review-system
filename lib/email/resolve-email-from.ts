const DEFAULT_SENDER_NAME = "One Core App";

function isLikelyEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Uses the business mailbox when it looks valid; otherwise the platform default.
 * The business domain must be verified in Resend for the business `from` to deliver.
 */
export function resolveEmailFrom(opts: {
  businessEmail?: string | null;
  businessDisplayName?: string | null;
}): string {
  const defaultAddr =
    process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const mail = opts.businessEmail?.trim();
  if (mail && isLikelyEmail(mail)) {
    const name =
      opts.businessDisplayName?.trim() || DEFAULT_SENDER_NAME;
    return `${name} <${mail}>`;
  }
  return `${DEFAULT_SENDER_NAME} <${defaultAddr}>`;
}
