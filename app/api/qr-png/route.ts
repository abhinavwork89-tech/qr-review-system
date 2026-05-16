import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { isSafeHttpUrl } from "@/lib/review/business-config";

export const runtime = "nodejs";

const MAX_PAYLOAD_CHARS = 3500;

/**
 * Renders a PNG QR for an **allowed** absolute URL (same-origin scan or review page).
 * Used by welcome email `<Img>` so clients do not load arbitrary third-party assets as QR.
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
  const allowedScan = path === "/api/scan/out";
  const allowedReview = /^\/r\/[^/]+$/.test(path);
  if (!allowedScan && !allowedReview) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (allowedScan) {
    const b = target.searchParams.get("b")?.trim() ?? "";
    const t = target.searchParams.get("t")?.trim() ?? "";
    const u = target.searchParams.get("u")?.trim() ?? "";
    if (!b || !t || !u) {
      return new NextResponse("Invalid scan URL", { status: 400 });
    }
  }

  try {
    const buf = await QRCode.toBuffer(payloadRaw, {
      type: "png",
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
    });
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
