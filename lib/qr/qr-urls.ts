const BUSINESS_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Permanent master QR payload path (dynamic redirect at runtime). */
export function buildMasterQrPayloadUrl(appOrigin: string, businessId: string): string {
  const base = appOrigin.trim().replace(/\/+$/, "");
  const id = businessId.trim();
  return `${base}/m/${encodeURIComponent(id)}`;
}

/** True when URL is the canonical `/m/{businessId}` master QR payload. */
export function isMasterQrPayloadUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return /^\/m\/[^/]+$/.test(u.pathname) && BUSINESS_ID_RE.test(decodeURIComponent(u.pathname.slice(3)));
  } catch {
    return false;
  }
}

/** Legacy master QR used `/api/scan/out?b=…&t=master&u=…` — must not be encoded in new QRs. */
export function isLegacyMasterTrackedScanUrl(url: string): boolean {
  return parseBusinessIdFromLegacyMasterScanUrl(url) !== null;
}

export function parseBusinessIdFromLegacyMasterScanUrl(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.pathname.replace(/\/+$/, "") !== "/api/scan/out") return null;
    if ((u.searchParams.get("t") ?? "").trim().toLowerCase() !== "master") return null;
    const b = (u.searchParams.get("b") ?? "").trim();
    return BUSINESS_ID_RE.test(b) ? b : null;
  } catch {
    return null;
  }
}

/**
 * Ensures a master QR encodes only `/m/{businessId}`.
 * Rewrites legacy tracked scan/out URLs when detected.
 */
export function normalizeMasterQrPayloadUrl(
  candidate: string,
  businessId: string,
  appOrigin: string,
): string {
  const id = businessId.trim();
  const base = appOrigin.trim().replace(/\/+$/, "");
  if (!id) return candidate.trim();

  const trimmed = candidate.trim();
  if (trimmed && isMasterQrPayloadUrl(trimmed)) return trimmed;

  const legacyId = trimmed ? parseBusinessIdFromLegacyMasterScanUrl(trimmed) : null;
  if (legacyId) return buildMasterQrPayloadUrl(base, legacyId);

  if (trimmed.startsWith("/m/")) {
    return `${base}${trimmed}`;
  }

  return buildMasterQrPayloadUrl(base, id);
}
/** Fixed public review page URL (independent of master target). */
export function buildPublicReviewQrUrl(appOrigin: string, slug: string): string {
  const base = appOrigin.trim().replace(/\/+$/, "");
  const seg = encodeURIComponent(slug.trim()) || "-";
  return `${base}/r/${seg}`;
}
