function isLikelyEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Parses comma/semicolon/whitespace-separated addresses (e.g. `ADMIN_EMAIL`).
 */
export function parseNotifyRecipientList(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  const parts = raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  return parts.filter(isLikelyEmail);
}
