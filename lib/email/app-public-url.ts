import {
  getPublicAppOrigin,
  resolvePublicAppOrigin,
} from "@/lib/public-app-origin";

export { getPublicAppOrigin, resolvePublicAppOrigin } from "@/lib/public-app-origin";

/**
 * Public site origin for absolute links in emails (review page, admin links).
 */
export function buildReviewPageUrl(slug: string): string {
  const base = resolvePublicAppOrigin().replace(/\/+$/, "");
  const s = slug.trim();
  return `${base}/r/${s}`;
}

export function buildAdminBusinessUrl(businessId: string): string | undefined {
  const base = getPublicAppOrigin();
  if (!base) return undefined;
  return `${base.replace(/\/+$/, "")}/admin/business/${businessId.trim()}`;
}
