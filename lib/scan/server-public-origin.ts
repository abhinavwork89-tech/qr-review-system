import { headers } from "next/headers";
import { scanTrackingPublicOrigin } from "@/lib/scan/build-tracked-out-url";

/**
 * Public origin for absolute URLs built during a request (redirects, review base).
 * Uses proxy headers when present so `/r/[slug]` matches the host the user opened
 * (copy-paste, QR scan) even when `NEXT_PUBLIC_APP_URL` is unset or points elsewhere.
 */
export async function getServerRequestPublicOrigin(): Promise<string> {
  try {
    const h = await headers();
    const hostRaw = h.get("x-forwarded-host") ?? h.get("host");
    if (!hostRaw) return scanTrackingPublicOrigin();

    const host = hostRaw.split(",")[0].trim();
    if (!host || /[\s\\/]/.test(host)) return scanTrackingPublicOrigin();

    const isLocal =
      host === "localhost" ||
      host.startsWith("127.") ||
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1");

    const protoRaw = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
    const proto =
      protoRaw === "http" || protoRaw === "https"
        ? protoRaw
        : isLocal
          ? "http"
          : "https";

    return `${proto}://${host}`;
  } catch {
    return scanTrackingPublicOrigin();
  }
}
