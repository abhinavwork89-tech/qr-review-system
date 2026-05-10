/**
 * Public site origin for absolute links in emails (review page, admin links).
 * Prefer `NEXT_PUBLIC_APP_URL`; on Vercel use `VERCEL_URL` if unset.
 */
export function getPublicAppOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const u = new URL(configured);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return `${u.protocol}//${u.host}`;
      }
    } catch {
      /* ignore */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return null;
}

export function buildReviewPageUrl(slug: string): string {
  const base = getPublicAppOrigin();
  const s = slug.trim();
  if (base) return `${base}/r/${s}`;
  return `http://localhost:3000/r/${s}`;
}

export function buildAdminBusinessUrl(businessId: string): string | undefined {
  const base = getPublicAppOrigin();
  if (!base) return undefined;
  return `${base}/admin/business/${businessId.trim()}`;
}
