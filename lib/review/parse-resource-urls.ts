import { isSafeHttpUrl } from "@/lib/review/business-config";

/** Public-safe HTTPS image / asset URLs from `businesses.resource_urls` jsonb. */
export function parsePublicResourceUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const u = item.trim();
    if (!u || !isSafeHttpUrl(u)) continue;
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

export function isProbablyImageResourceUrl(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path);
}
