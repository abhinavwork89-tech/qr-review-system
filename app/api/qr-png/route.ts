import { NextRequest, NextResponse } from "next/server";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { renderQrPngBuffer } from "@/lib/qr/render-qr-png-buffer";

export const runtime = "nodejs";

const MAX_PAYLOAD_CHARS = 3500;

/**
 * Renders a PNG QR for an **allowed** same-origin URL (`/m/{businessId}` or `/r/{slug}` only).
 * Tracked `/api/scan/out` payloads are rejected so master QR cannot be generated via this route.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  let payloadRaw = request.nextUrl.searchParams.get("payload") ?? "";
  try {
    payloadRaw = decodeURIComponent(payloadRaw);
  } catch {
    return new NextResponse("Invalid payload encoding", { status: 400 });
  }

  if (!payloadRaw || payloadRaw.length > MAX_PAYLOAD_CHARS) {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  if (!isSafeHttpUrl(payloadRaw)) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(payloadRaw);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (target.origin !== origin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const path = target.pathname;
  const allowedReview = /^\/r\/[^/]+$/.test(path);
  const allowedMaster = /^\/m\/[^/]+$/.test(path);
  if (!allowedReview && !allowedMaster) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const buf = await renderQrPngBuffer(payloadRaw);
    if (!buf) {
      return new NextResponse("QR render failed", { status: 500 });
    }
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "QR render failed";
    return new NextResponse(msg, { status: 500 });
  }
}
