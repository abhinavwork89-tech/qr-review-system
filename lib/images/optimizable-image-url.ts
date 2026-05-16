/** True when URL can use next/image (Supabase public storage on configured project). */
export function isOptimizableRemoteImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return false;
  try {
    const allowedHost = new URL(base).hostname;
    const u = new URL(trimmed);
    return (
      u.hostname === allowedHost &&
      u.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}
