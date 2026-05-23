/**
 * Canonical public app origin for review URLs, scan tracking, emails, and QR payloads.
 * Production must set `NEXT_PUBLIC_APP_URL` (e.g. https://review.onecoreapp.com).
 */

export const PUBLIC_APP_LOCALHOST_ORIGIN = "http://localhost:3000";

function normalizeOriginUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function readNextPublicAppUrl(): string | null {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!env) return null;
  return normalizeOriginUrl(env);
}

function readVercelPreviewOrigin(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const vercel = process.env.VERCEL_URL?.trim();
  if (!vercel) return null;
  const host = vercel.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!host) return null;
  return `https://${host}`;
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Configured origin from env (and Vercel preview host in non-production). No localhost fallback.
 */
export function getPublicAppOrigin(): string | null {
  return readNextPublicAppUrl() ?? readVercelPreviewOrigin();
}

/**
 * Origin for absolute public URLs (SSR, emails, QR when request host is unavailable).
 * Client: prefers live `window.location.origin` when env is unset.
 * Production server: requires `NEXT_PUBLIC_APP_URL` (throws if missing).
 */
export function resolvePublicAppOrigin(): string {
  const fromEnv = readNextPublicAppUrl();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  if (!isProductionRuntime()) {
    return getPublicAppOrigin() ?? PUBLIC_APP_LOCALHOST_ORIGIN;
  }

  throw new Error(
    "NEXT_PUBLIC_APP_URL is missing in production. Set it to your public app URL (e.g. https://review.onecoreapp.com).",
  );
}

/**
 * Server-only origin for emails and QR generation (no `window` fallback).
 * Production requires `NEXT_PUBLIC_APP_URL`.
 */
export function resolveEmailPublicAppOrigin(): string {
  const fromEnv = readNextPublicAppUrl();
  if (fromEnv) return fromEnv;

  if (!isProductionRuntime()) {
    return getPublicAppOrigin() ?? PUBLIC_APP_LOCALHOST_ORIGIN;
  }

  throw new Error(
    "NEXT_PUBLIC_APP_URL is missing in production. Set it to your public app URL (e.g. https://review.onecoreapp.com).",
  );
}
