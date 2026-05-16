import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_VALUE,
} from "@/lib/admin-auth";

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https:",
      "connect-src 'self' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  );
  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return response;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    const isLogin = pathname === "/admin/login";
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const authed = session === ADMIN_SESSION_COOKIE_VALUE;

    if (isLogin) {
      if (authed) {
        return applySecurityHeaders(
          request,
          NextResponse.redirect(new URL("/admin/dashboard", request.url)),
        );
      }
      return applySecurityHeaders(request, NextResponse.next());
    }

    if (!authed) {
      const next = pathname + request.nextUrl.search;
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", next);
      return applySecurityHeaders(request, NextResponse.redirect(url));
    }
    return applySecurityHeaders(request, NextResponse.next());
  }

  return applySecurityHeaders(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
