const FALLBACK = "#0d9488";

/**
 * Returns a safe hex color for email clients, or a sensible default.
 */
export function sanitizePrimaryColor(input: string | null | undefined): string {
  const s = typeof input === "string" ? input.trim() : "";
  if (!s) return FALLBACK;
  const hex = s.startsWith("#") ? s : `#${s}`;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex.toLowerCase();
  return FALLBACK;
}
