import type { NextResponse } from "next/server";
import {
  consumePublicRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/security/public-rate-limit";

export type PublicRateLimitRule = {
  /** Map key prefix, e.g. `review:ip` */
  prefix: string;
  max: number;
  windowMs: number;
};

/**
 * Apply one or more sliding-window limits for a request IP.
 * Returns a 429 response when any rule is exceeded.
 */
export function enforcePublicRateLimits(
  headers: Headers,
  rules: PublicRateLimitRule[],
): NextResponse | null {
  const ip = getClientIp(headers);
  for (const rule of rules) {
    const key = `${rule.prefix}:${ip}`;
    const result = consumePublicRateLimit(key, rule.max, rule.windowMs);
    if (!result.allowed) {
      return rateLimitExceededResponse(result.retryAfterSec);
    }
  }
  return null;
}
