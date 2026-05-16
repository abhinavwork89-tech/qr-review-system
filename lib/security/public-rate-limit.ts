import { NextResponse } from "next/server";

type Bucket = { t: number[] };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 12_000;

function pruneKey(key: string, windowMs: number, now: number) {
  const b = buckets.get(key);
  if (!b) return;
  const kept = b.t.filter((x) => now - x < windowMs);
  if (kept.length === 0) buckets.delete(key);
  else b.t = kept;
}

function capMapSize() {
  if (buckets.size <= MAX_KEYS) return;
  const drop = Math.ceil(buckets.size * 0.25);
  let i = 0;
  for (const k of buckets.keys()) {
    buckets.delete(k);
    i++;
    if (i >= drop) break;
  }
}

/**
 * Sliding-window limiter (in-memory). Best-effort per Node instance; combine with DB-backed limits where needed.
 */
export function consumePublicRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  pruneKey(key, windowMs, now);
  capMapSize();

  let b = buckets.get(key);
  if (!b) {
    b = { t: [] };
    buckets.set(key, b);
  }
  b.t = b.t.filter((x) => now - x < windowMs);
  if (b.t.length >= max) {
    const oldest = b.t[0] ?? now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  b.t.push(now);
  if (b.t.length > max * 3) b.t.splice(0, b.t.length - max);
  return { allowed: true };
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

export function rateLimitExceededResponse(retryAfterSec: number): NextResponse {
  const res = NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 },
  );
  res.headers.set("Retry-After", String(retryAfterSec));
  return res;
}
