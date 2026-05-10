/** Matches Add Business expectations for theme hex fields. */
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function validateBrandHexColor(value: string): string | null {
  const t = value.trim();
  if (!t) return "This field is required";
  if (!HEX_COLOR_RE.test(t)) return "Enter a valid hex color (e.g. #4f46e5)";
  return null;
}
