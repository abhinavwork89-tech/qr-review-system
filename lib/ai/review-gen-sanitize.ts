import { stripDangerousSequences } from "@/lib/security/input-sanitize";

const MIN_LEN = 80;
const MAX_LEN = 220;

/** Single-line review text safe for JSON + UI. */
export function sanitizeReviewSuggestion(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let s = stripDangerousSequences(raw)
    .replace(/\s+/g, " ")
    .replace(/["'`<>{}[\]\\]/g, "")
    .trim();
  if (s.length < MIN_LEN) return null;
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN).trim();
  if (s.length < MIN_LEN) return null;
  return s;
}

export function sanitizeReviewSuggestionList(
  raw: unknown[],
  expected: number,
): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = sanitizeReviewSuggestion(item);
    if (s) out.push(s);
    if (out.length >= expected) break;
  }
  if (out.length !== expected) return null;
  return out;
}
