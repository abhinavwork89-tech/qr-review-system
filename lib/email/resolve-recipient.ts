import { parseNotifyRecipientList } from "@/lib/email/notify-recipients";

function isLikelyEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Sends transactional mail to the business mailbox when valid; otherwise the first
 * address from `ADMIN_EMAIL` (comma/semicolon/whitespace separated).
 */
export function resolveBusinessRecipient(
  businessEmail: string | null | undefined,
): string | null {
  const b = typeof businessEmail === "string" ? businessEmail.trim() : "";
  if (b && isLikelyEmail(b)) return b;
  const admins = parseNotifyRecipientList(process.env.ADMIN_EMAIL);
  return admins[0] ?? null;
}
