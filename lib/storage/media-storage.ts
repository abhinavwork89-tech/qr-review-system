/**
 * Centralized Supabase `business-media` path resolution and safe delete helpers.
 */

export const BUSINESS_MEDIA_BUCKET = "business-media";

const MEDIA_KINDS = new Set([
  "logo",
  "banner",
  "resource",
  "branding",
  "identity_proof",
  "client_photo",
]);

export type MediaStorageKind = typeof MEDIA_KINDS extends Set<infer K> ? K : string;

export type ResolveStoragePathOptions = {
  /** When set, path must start with `{slug}/` */
  businessSlug?: string;
  allowedKinds?: ReadonlySet<string>;
};

/** Map public Supabase URL → object path inside `business-media`. */
export function publicUrlToStoragePath(
  publicUrl: string,
  options?: ResolveStoragePathOptions,
): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/public/${BUSINESS_MEDIA_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    if (!path || path.includes("..")) return null;

    const segments = path.split("/").filter(Boolean);
    if (segments.length < 3) return null;

    const kind = segments[1]?.toLowerCase();
    const kinds = options?.allowedKinds ?? MEDIA_KINDS;
    if (!kind || !kinds.has(kind)) return null;

    if (options?.businessSlug) {
      const slug = normalizeStorageSlug(options.businessSlug);
      if (segments[0] !== slug) return null;
    }

    return path;
  } catch {
    return null;
  }
}

export function normalizeStorageSlug(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "business";
}

/** URLs present in `before` but not in `after` (trimmed, stable). */
export function diffRemovedMediaUrls(before: string[], after: string[]): string[] {
  const afterSet = new Set(after.map((u) => u.trim()).filter(Boolean));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of before) {
    const u = raw.trim();
    if (!u || afterSet.has(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Preserve order; drop empty and exact duplicates. */
export function dedupeMediaUrls(urls: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const u = raw.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function resolveDeletableStoragePaths(
  urls: string[],
  options?: ResolveStoragePathOptions,
): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    const path = publicUrlToStoragePath(url, options);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}
