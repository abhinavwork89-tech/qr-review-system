/** Pure helpers for business type labels (safe for client components). */

function formatSlugAsLabel(slug: string): string {
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Catalog from `business_types` plus any in-use slugs not in the catalog (legacy rows).
 */
export function mergeBusinessTypeCatalogWithInUseSlugs(
  catalog: { slug: string; name: string }[],
  inUseSlugs: string[],
): { slug: string; name: string }[] {
  const map = new Map<string, string>();
  for (const o of catalog) {
    const s = o.slug.trim();
    if (s) map.set(s, o.name.trim() || formatSlugAsLabel(s));
  }
  for (const raw of inUseSlugs) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (s && !map.has(s)) map.set(s, formatSlugAsLabel(s));
  }
  return Array.from(map.entries())
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveBusinessTypeDisplayName(
  slug: string | null | undefined,
  options: { slug: string; name: string }[],
): string {
  if (!slug?.trim()) return "—";
  const s = slug.trim();
  const hit = options.find((o) => o.slug === s);
  return hit?.name ?? formatSlugAsLabel(s);
}
