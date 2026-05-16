import { NextResponse } from "next/server";

/** Reject oversized JSON bodies using Content-Length when present (cheap guard before buffering). */
export function rejectOversizedBody(
  request: Request,
  maxBytes: number,
): NextResponse | null {
  const raw = request.headers.get("content-length");
  if (raw == null || raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n > maxBytes) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  return null;
}
