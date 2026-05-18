import { isSafeHttpUrl } from "@/lib/review/business-config";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "music.youtube.com",
]);

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/** Safe https/http URL on a known YouTube host (channel, video, or youtu.be). */
export function isSafeYouTubeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!isSafeHttpUrl(trimmed)) return false;
  try {
    const host = normalizeHost(new URL(trimmed).hostname);
    if (YOUTUBE_HOSTS.has(host)) return true;
    return host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}
