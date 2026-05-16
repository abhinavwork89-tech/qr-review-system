import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_VALUE,
  getAdminAuthEnv,
} from "@/lib/admin-auth";
import { enforcePublicRateLimits } from "@/lib/security/enforce-public-rate-limit";
import { createRouteLogger } from "@/lib/logging/app-logger";
import { getClientIp } from "@/lib/security/public-rate-limit";
import { rejectOversizedBody } from "@/lib/security/request-body-limit";

export async function POST(request: Request) {
  const log = createRouteLogger("auth", "/api/admin/login", request.headers);
  const tooLarge = rejectOversizedBody(request, 2048);
  if (tooLarge) return tooLarge;

  const limited = enforcePublicRateLimits(request.headers, [
    { prefix: "admin-login:ip", max: 12, windowMs: 15 * 60_000 },
  ]);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const body = json as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const expected = getAdminAuthEnv();
  if (email !== expected.email || password !== expected.password) {
    log.warn("login_failed", { ip: getClientIp(request.headers) });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  log.info("login_success", { ip: getClientIp(request.headers) });

  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: ADMIN_SESSION_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
