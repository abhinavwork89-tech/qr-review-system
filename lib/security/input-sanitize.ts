/**
 * Lightweight XSS / injection hardening for stored user text and URLs.
 * Does not replace HTML parsers — strips common vectors and normalizes URLs.
 */

import { normalizeDialCode } from "@/lib/phone/mobile";
import { WHATSAPP_LOCAL_MAX_LEN } from "@/lib/whatsapp/wa-me";
import {
  clampCallLocalInput,
  normalizeCallCountryCodeStored,
} from "@/lib/call/call-channel";
import { normalizeMasterQrType, type MasterQrType } from "@/lib/scan/master-qr";

/** Remove disallowed control chars; keeps tab/newline/carriage return for review copy. */
const CTRL_DISALLOWED = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

export function stripDangerousSequences(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/\0/g, "")
    .replace(CTRL_DISALLOWED, "")
    .replace(/<[^>]*>/g, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/vbscript:/gi, "");
}

export function sanitizePlainText(input: string, maxLen: number): string {
  let s = stripDangerousSequences(input).trim();
  if (maxLen > 0 && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function sanitizeEmail(input: string): string {
  return stripDangerousSequences(input).trim().toLowerCase().slice(0, 320);
}

export function sanitizeMobile(input: string): string {
  return stripDangerousSequences(input).trim().replace(/\s+/g, " ");
}

/** Hex colors, slugs, short codes — strip injection chars without removing `#`. */
export function sanitizeCssToken(input: string, maxLen: number): string {
  return stripDangerousSequences(input).trim().slice(0, maxLen);
}

export function normalizeSafeHttpUrl(input: string): string {
  const t = stripDangerousSequences(input).trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

export function normalizeSafeHttpsUrl(input: string): string {
  const t = stripDangerousSequences(input).trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

export function sanitizeUrlArray(urls: string[]): string[] {
  return urls
    .map((u) => normalizeSafeHttpUrl(u))
    .filter((u) => u.length > 0);
}

export function sanitizeBusinessChannels(
  channels: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) {
    return channels;
  }
  const out: Record<string, unknown> = { ...channels };
  const linkKeys = ["instagram", "whatsapp", "facebook", "website", "x", "twitter"] as const;
  for (const key of linkKeys) {
    const block = out[key];
    if (block && typeof block === "object" && !Array.isArray(block)) {
      const b = block as Record<string, unknown>;
      const url = typeof b.url === "string" ? normalizeSafeHttpUrl(b.url) : "";
      out[key] = { ...b, url };
    }
  }
  if (Array.isArray(out.reward_config)) {
    out.reward_config = out.reward_config
      .filter((x): x is string => typeof x === "string")
      .map((x) => sanitizePlainText(x, 500));
  }
  return out;
}

export type BusinessInsertSanitize = {
  name: string;
  email: string;
  mobile: string;
  brand_name: string;
  business_type: string;
  primary_color: string;
  secondary_color: string;
  language: string;
  plan_type: string;
  google_url: string;
  threshold: number;
  direct_redirect: boolean;
  allow_low_rating_redirect: boolean;
  channels: Record<string, unknown> | null;
  logo_url: string | null;
  banner_urls: string[];
  resource_urls: string[];
  status: "active" | "inactive" | "deleted";
  identity_type: string | null;
  identity_number: string | null;
  identity_proof_urls: string[];
  client_photo_url: string | null;
  whatsapp_country_code: string | null;
  whatsapp_number: string | null;
  call_enabled: boolean;
  call_country_code: string;
  call_number: string | null;
  master_qr_type: MasterQrType;
};

export function sanitizeBusinessInsertPayload<T extends BusinessInsertSanitize>(row: T): T {
  return {
    ...row,
    name: sanitizePlainText(row.name, 200),
    email: sanitizeEmail(row.email),
    mobile: sanitizeMobile(row.mobile),
    brand_name: sanitizePlainText(row.brand_name, 200),
    business_type: sanitizeCssToken(row.business_type, 80),
    primary_color: sanitizeCssToken(row.primary_color, 32),
    secondary_color: sanitizeCssToken(row.secondary_color, 32),
    language: sanitizeCssToken(row.language, 32),
    plan_type: sanitizeCssToken(row.plan_type, 64),
    google_url: row.google_url ? normalizeSafeHttpUrl(row.google_url) : "",
    logo_url: row.logo_url ? normalizeSafeHttpUrl(row.logo_url) || null : null,
    banner_urls: sanitizeUrlArray(row.banner_urls),
    resource_urls: sanitizeUrlArray(row.resource_urls),
    channels: sanitizeBusinessChannels(row.channels),
    identity_type:
      row.identity_type && typeof row.identity_type === "string"
        ? sanitizeCssToken(row.identity_type.toLowerCase(), 32) || null
        : null,
    identity_number:
      row.identity_number && typeof row.identity_number === "string"
        ? sanitizePlainText(row.identity_number, 32)
        : null,
    identity_proof_urls: sanitizeUrlArray(row.identity_proof_urls ?? []),
    client_photo_url: row.client_photo_url
      ? normalizeSafeHttpUrl(row.client_photo_url) || null
      : null,
    whatsapp_country_code:
      row.whatsapp_country_code && typeof row.whatsapp_country_code === "string"
        ? normalizeDialCode(row.whatsapp_country_code)
        : null,
    whatsapp_number:
      row.whatsapp_number && typeof row.whatsapp_number === "string"
        ? row.whatsapp_number.replace(/\D/g, "").slice(0, WHATSAPP_LOCAL_MAX_LEN) || null
        : null,
    call_enabled: row.call_enabled === true,
    call_country_code: normalizeCallCountryCodeStored(
      typeof row.call_country_code === "string" ? row.call_country_code : "91",
    ),
    call_number:
      row.call_number && typeof row.call_number === "string"
        ? clampCallLocalInput(row.call_number) || null
        : null,
    master_qr_type:
      normalizeMasterQrType(row.master_qr_type) ?? (row.master_qr_type as MasterQrType),
  };
}

export function sanitizeBusinessPatchRecord(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };

  if ("name" in out && typeof out.name === "string") {
    out.name = sanitizePlainText(out.name, 200);
  }
  if ("brand_name" in out && typeof out.brand_name === "string") {
    out.brand_name = sanitizePlainText(out.brand_name, 200);
  }
  if ("email" in out && typeof out.email === "string") {
    out.email = sanitizeEmail(out.email);
  }
  if ("mobile" in out && typeof out.mobile === "string") {
    out.mobile = sanitizeMobile(out.mobile);
  }
  if ("business_type" in out && typeof out.business_type === "string") {
    out.business_type = sanitizeCssToken(out.business_type, 80);
  }
  if ("primary_color" in out && typeof out.primary_color === "string") {
    out.primary_color = sanitizeCssToken(out.primary_color, 32);
  }
  if ("secondary_color" in out && typeof out.secondary_color === "string") {
    out.secondary_color = sanitizeCssToken(out.secondary_color, 32);
  }
  if ("language" in out && typeof out.language === "string") {
    out.language = sanitizeCssToken(out.language, 32);
  }
  if ("plan_type" in out && typeof out.plan_type === "string") {
    out.plan_type = sanitizeCssToken(out.plan_type, 64);
  }
  if ("google_url" in out && typeof out.google_url === "string") {
    out.google_url = normalizeSafeHttpUrl(out.google_url);
  }
  if ("logo_url" in out) {
    const v = out.logo_url;
    if (v === null || v === "") out.logo_url = null;
    else if (typeof v === "string") {
      const n = normalizeSafeHttpUrl(v);
      out.logo_url = n || null;
    }
  }
  if ("banner_urls" in out && Array.isArray(out.banner_urls)) {
    out.banner_urls = sanitizeUrlArray(out.banner_urls as string[]);
  }
  if ("resource_urls" in out && Array.isArray(out.resource_urls)) {
    out.resource_urls = sanitizeUrlArray(out.resource_urls as string[]);
  }
  if ("channels" in out && out.channels !== undefined && out.channels !== null) {
    if (typeof out.channels === "object" && !Array.isArray(out.channels)) {
      out.channels = sanitizeBusinessChannels(out.channels as Record<string, unknown>);
    }
  }

  if ("whatsapp_country_code" in out) {
    const v = out.whatsapp_country_code;
    if (v === null || v === undefined || v === "") out.whatsapp_country_code = null;
    else if (typeof v === "string") out.whatsapp_country_code = normalizeDialCode(v);
  }
  if ("whatsapp_number" in out) {
    const v = out.whatsapp_number;
    if (v === null || v === undefined || v === "") out.whatsapp_number = null;
    else if (typeof v === "string") {
      const d = v.replace(/\D/g, "").slice(0, WHATSAPP_LOCAL_MAX_LEN);
      out.whatsapp_number = d.length > 0 ? d : null;
    }
  }

  if ("call_enabled" in out) {
    const v = out.call_enabled;
    out.call_enabled = v === true;
  }
  if ("call_country_code" in out && typeof out.call_country_code === "string") {
    out.call_country_code = normalizeCallCountryCodeStored(out.call_country_code);
  }
  if ("call_number" in out) {
    const v = out.call_number;
    if (v === null || v === undefined || v === "") out.call_number = null;
    else if (typeof v === "string") {
      const d = clampCallLocalInput(v);
      out.call_number = d.length > 0 ? d : null;
    }
  }

  if ("identity_type" in out) {
    const v = out.identity_type;
    if (v === null || v === "") out.identity_type = null;
    else if (typeof v === "string") {
      const s = sanitizeCssToken(v.toLowerCase(), 32);
      out.identity_type = s || null;
    }
  }
  if ("identity_number" in out) {
    const v = out.identity_number;
    if (v === null || v === "") out.identity_number = null;
    else if (typeof v === "string") out.identity_number = sanitizePlainText(v, 32);
  }
  if ("identity_proof_urls" in out && Array.isArray(out.identity_proof_urls)) {
    out.identity_proof_urls = sanitizeUrlArray(out.identity_proof_urls as string[]);
  }
  if ("client_photo_url" in out) {
    const v = out.client_photo_url;
    if (v === null || v === "") out.client_photo_url = null;
    else if (typeof v === "string") {
      const n = normalizeSafeHttpUrl(v);
      out.client_photo_url = n || null;
    }
  }

  if ("master_qr_type" in out) {
    const v = out.master_qr_type;
    if (v === null || v === undefined || v === "") {
      out.master_qr_type = null;
    } else if (typeof v === "string") {
      out.master_qr_type = normalizeMasterQrType(v.trim());
    }
  }

  return out;
}
