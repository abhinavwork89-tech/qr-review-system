import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { scheduleWelcomeEmailAfterCreate } from "@/lib/email/lifecycle-triggers";
import {
  finalizeIdentityForDb,
  getIdentityFieldErrors,
  parseIdentityTypeInput,
} from "@/lib/business/identity";
import { sanitizeBusinessInsertPayload } from "@/lib/security/input-sanitize";
import { listBusinessTypeSelectOptions } from "@/lib/data/business-types-admin";
import { normalizeDialCode } from "@/lib/phone/mobile";
import {
  clampWhatsAppLocalInput,
  finalizeWhatsAppForPersist,
  validateWhatsAppLocalForDial,
} from "@/lib/whatsapp/wa-me";
import { finalizeCallForPersist, getCallFormErrors } from "@/lib/call/call-channel";
import {
  computeDefaultMasterQrType,
  normalizeMasterQrType,
  validateMasterQrForPersist,
  type MasterQrType,
} from "@/lib/scan/master-qr";

const SLUG_SUFFIX_LEN = 4;
const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function isValidMobile(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  return /^\+\d{8,15}$/.test(compact);
}

function readBool(v: unknown, defaultValue: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return defaultValue;
}

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const parsed = await parseBusinessBody(json, supabase);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fields: parsed.fields },
        { status: 400 },
      );
    }

    const row = sanitizeBusinessInsertPayload(parsed.data);

    const maxAttempts = 8;
    let lastError: { message: string; code?: string } | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slug = buildSlug(row.brand_name);

      const { data, error } = await supabase
        .from("businesses")
        .insert({
          slug,
          name: row.name,
          email: row.email,
          mobile: row.mobile,
          brand_name: row.brand_name,
          business_type: row.business_type,
          primary_color: row.primary_color,
          secondary_color: row.secondary_color,
          language: row.language,
          plan_type: row.plan_type,
          google_url: row.google_url,
          threshold: row.threshold,
          direct_redirect: row.direct_redirect,
          allow_low_rating_redirect: row.allow_low_rating_redirect,
          channels: row.channels,
          logo_url: row.logo_url,
          banner_urls: row.banner_urls,
          resource_urls: row.resource_urls,
          status: row.status,
          is_active: isBusinessActiveStatus(row.status),
          identity_type: row.identity_type,
          identity_number: row.identity_number,
          identity_proof_urls: row.identity_proof_urls,
          client_photo_url: row.client_photo_url,
          whatsapp_country_code: row.whatsapp_country_code,
          whatsapp_number: row.whatsapp_number,
          call_enabled: row.call_enabled,
          call_country_code: row.call_country_code,
          call_number: row.call_number,
          master_qr_type: row.master_qr_type,
        })
        .select("id")
        .single();

      if (!error && data) {
        scheduleWelcomeEmailAfterCreate({
          businessId: data.id,
          slug,
          name: row.name,
          brandName: row.brand_name,
          email: row.email,
          logoUrl: row.logo_url,
          primaryColor: row.primary_color,
          google_url: (row.google_url ?? "").trim() || null,
          channels: row.channels,
          whatsapp_country_code: row.whatsapp_country_code,
          whatsapp_number: row.whatsapp_number,
          master_qr_type:
            row.master_qr_type != null && typeof row.master_qr_type === "string"
              ? row.master_qr_type
              : null,
        });
        return NextResponse.json(
          { ok: true, slug, id: data.id },
          { status: 201 },
        );
      }

      lastError = error
        ? { message: error.message, code: error.code }
        : { message: "Insert failed" };

      if (error?.code === "23505") {
        continue;
      }

      const status =
        error?.code === "23503" || error?.code === "23514" ? 400 : 500;
      return NextResponse.json(
        {
          error: error?.message ?? "Database error",
          ...(error?.code ? { code: error.code } : {}),
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: lastError?.message ?? "Could not allocate a unique slug",
        ...(lastError?.code ? { code: lastError.code } : {}),
      },
      { status: 409 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type BusinessInsertPayload = {
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

type ParseOk = { ok: true; data: BusinessInsertPayload };
type ParseErr = {
  ok: false;
  error: string;
  fields?: Record<string, string>;
};

async function parseBusinessBody(
  body: unknown,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<ParseOk | ParseErr> {
  const fields: Record<string, string> = {};

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const o = body as Record<string, unknown>;

  const name = readTrimmedString(o.name);
  const email = readTrimmedString(o.email);
  const mobile = readTrimmedString(o.mobile);
  const brand_name = readTrimmedString(o.brand_name);
  const primary_color = readTrimmedString(o.primary_color);
  const secondary_color = readTrimmedString(o.secondary_color);
  const language = readTrimmedString(o.language);
  const plan_type = readTrimmedString(o.plan_type);
  const business_type = readTrimmedString(o.business_type);
  if (!business_type) fields.business_type = "Required";

  const google_url_parsed = readOptionalUrl(o.google_url);
  if (google_url_parsed === "__invalid__") {
    fields.google_url = "Must be a valid URL";
  }
  const google_url =
    google_url_parsed === "__invalid__" || google_url_parsed === null ? "" : google_url_parsed;

  if (!name) fields.name = "Required";
  if (!email) fields.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fields.email = "Invalid email";
  if (!mobile) fields.mobile = "Required";
  else if (!isValidMobile(mobile)) fields.mobile = "Invalid mobile";
  if (!brand_name) fields.brand_name = "Required";
  if (!primary_color) fields.primary_color = "Required";
  if (!secondary_color) fields.secondary_color = "Required";
  if (!language) fields.language = "Required";
  if (!plan_type) fields.plan_type = "Required";

  const thresholdRaw = o.threshold;
  let threshold: number;
  if (typeof thresholdRaw === "number" && Number.isInteger(thresholdRaw)) {
    threshold = thresholdRaw;
  } else if (
    typeof thresholdRaw === "string" &&
    /^\d+$/.test(thresholdRaw.trim())
  ) {
    threshold = Number.parseInt(thresholdRaw.trim(), 10);
  } else {
    fields.threshold = "Must be an integer";
    threshold = 0;
  }
  if (!fields.threshold && (threshold < 1 || threshold > 5)) {
    fields.threshold = "Must be from 1 to 5";
  }

  const allow = o.allow_low_rating_redirect;
  let allow_low_rating_redirect: boolean;
  if (typeof allow === "boolean") {
    allow_low_rating_redirect = allow;
  } else if (allow === "true" || allow === "false") {
    allow_low_rating_redirect = allow === "true";
  } else {
    fields.allow_low_rating_redirect = "Must be a boolean";
    allow_low_rating_redirect = false;
  }

  const direct = o.direct_redirect;
  let direct_redirect: boolean;
  if (typeof direct === "boolean") {
    direct_redirect = direct;
  } else if (direct === "true" || direct === "false") {
    direct_redirect = direct === "true";
  } else if (direct === undefined) {
    direct_redirect = true;
  } else {
    fields.direct_redirect = "Must be a boolean";
    direct_redirect = true;
  }

  const channels = readObjectOrNull(o.channels);
  if (o.channels !== undefined && channels === null) {
    fields.channels = "Must be an object";
  }

  const waCcSource =
    typeof o.whatsapp_country_code === "string"
      ? o.whatsapp_country_code
      : typeof o.whatsappCountryCode === "string"
        ? o.whatsappCountryCode
        : "";
  const waNumSource =
    typeof o.whatsapp_number === "string"
      ? o.whatsapp_number
      : typeof o.whatsappNumber === "string"
        ? o.whatsappNumber
        : "";
  const whatsappSub =
    channels && typeof channels.whatsapp === "object" && !Array.isArray(channels.whatsapp)
      ? (channels.whatsapp as Record<string, unknown>)
      : null;
  const waEnabled = whatsappSub?.enabled === true;
  if (waEnabled) {
    const numDigits = clampWhatsAppLocalInput(waNumSource);
    const cc = normalizeDialCode(waCcSource || "+91");
    const waErr = validateWhatsAppLocalForDial(cc, numDigits);
    if (waErr) fields.whatsapp_number = waErr;
  }

  const waPack = finalizeWhatsAppForPersist(
    channels,
    waCcSource || "+91",
    waNumSource,
  );

  const callCcSource =
    typeof o.call_country_code === "string"
      ? o.call_country_code
      : typeof o.callCountryCode === "string"
        ? o.callCountryCode
        : "";
  const callNumSource =
    typeof o.call_number === "string"
      ? o.call_number
      : typeof o.callNumber === "string"
        ? o.callNumber
        : "";
  const callEnabled = readBool(o.call_enabled ?? o.callEnabled, false);
  const callDialForValidate = normalizeDialCode(callCcSource || "+91");
  const callErr = getCallFormErrors({
    enabled: callEnabled,
    countryDialRaw: callDialForValidate,
    localRaw: callNumSource,
  });
  if (callErr.callCountryCode) fields.call_country_code = callErr.callCountryCode;
  if (callErr.callNumber) fields.call_number = callErr.callNumber;

  const callFin = finalizeCallForPersist(callEnabled, callDialForValidate, callNumSource);

  const masterRaw =
    typeof o.master_qr_type === "string"
      ? o.master_qr_type
      : typeof o.masterQrType === "string"
        ? o.masterQrType
        : "";
  const masterTypeResolved =
    normalizeMasterQrType(masterRaw) ??
    computeDefaultMasterQrType({
      google_url: google_url || null,
      channels: waPack.channels,
      whatsapp_country_code: waPack.whatsapp_country_code,
      whatsapp_number: waPack.whatsapp_number,
    });
  const masterValErr = validateMasterQrForPersist({
    master_qr_type: masterTypeResolved,
    google_url: google_url || null,
    channels: waPack.channels,
    whatsapp_country_code: waPack.whatsapp_country_code,
    whatsapp_number: waPack.whatsapp_number,
  });
  if (masterValErr) {
    fields.master_qr_type = masterValErr;
  }

  const logo_url = readOptionalUrl(o.logo_url);
  if (logo_url === "__invalid__") {
    fields.logo_url = "Must be a valid URL";
  }

  const banner_urls = readOptionalUrlArray(o.banner_urls);
  if (banner_urls === null) {
    fields.banner_urls = "Must be an array of valid URLs";
  }

  const resource_urls = readOptionalUrlArray(o.resource_urls);
  if (resource_urls === null) {
    fields.resource_urls = "Must be an array of valid URLs";
  }

  const identityTypeRaw =
    typeof o.identity_type === "string"
      ? o.identity_type.trim()
      : typeof o.identityType === "string"
        ? o.identityType.trim()
        : "";
  const identityNumberSrc =
    typeof o.identity_number === "string"
      ? o.identity_number.trim()
      : typeof o.identityNumber === "string"
        ? o.identityNumber.trim()
        : "";
  const identityTypeForErr = parseIdentityTypeInput(identityTypeRaw) || null;
  Object.assign(fields, getIdentityFieldErrors(identityTypeForErr, identityNumberSrc));

  const identityProofUrlsParsed = readOptionalUrlArray(o.identity_proof_urls);
  if (identityProofUrlsParsed === null) {
    fields.identity_proof_urls = "Must be an array of valid URLs";
  } else if (identityProofUrlsParsed.length < 1) {
    fields.identity_proof_urls = "Upload at least one identity proof photo.";
  }

  const clientPhotoSrc = o.client_photo_url ?? o.clientPhotoUrl;
  const clientPhotoParsed = readOptionalUrl(clientPhotoSrc);
  if (clientPhotoParsed === "__invalid__") {
    fields.client_photo_url = "Must be a valid URL";
  } else if (clientPhotoParsed === null || !clientPhotoParsed) {
    fields.client_photo_url = "Client profile photo is required.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Validation failed", fields };
  }

  const { data: typeOk, error: typeErr } = await supabase
    .from("business_types")
    .select("slug")
    .eq("slug", business_type)
    .maybeSingle();

  if (typeErr) {
    if (typeErr.code !== "42P01") {
      return {
        ok: false,
        error: "Could not validate business type",
        fields: { business_type: typeErr.message },
      };
    }
  } else if (!typeOk) {
    return {
      ok: false,
      error: "Validation failed",
      fields: {
        business_type:
          "Unknown business type. Add it under Admin → Settings → Business Types.",
      },
    };
  }

  const identityFinal = finalizeIdentityForDb(identityTypeRaw, identityNumberSrc);

  return {
    ok: true,
    data: {
      name,
      email,
      mobile,
      brand_name,
      business_type,
      primary_color,
      secondary_color,
      language,
      plan_type,
      google_url,
      threshold,
      direct_redirect,
      allow_low_rating_redirect,
      channels: waPack.channels,
      whatsapp_country_code: waPack.whatsapp_country_code,
      whatsapp_number: waPack.whatsapp_number,
      call_enabled: callFin.call_enabled,
      call_country_code: callFin.call_country_code,
      call_number: callFin.call_number,
      logo_url: logo_url === "__invalid__" ? null : logo_url,
      banner_urls: banner_urls ?? [],
      resource_urls: resource_urls ?? [],
      status: normalizeBusinessStatus({
        status: o.status,
        is_active: o.is_active,
      }),
      identity_type: identityFinal.identity_type,
      identity_number: identityFinal.identity_number,
      identity_proof_urls: identityProofUrlsParsed ?? [],
      client_photo_url:
        clientPhotoParsed === "__invalid__" || clientPhotoParsed === null
          ? null
          : clientPhotoParsed,
      master_qr_type: masterTypeResolved,
    },
  };
}

function readTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function readObjectOrNull(v: unknown): Record<string, unknown> | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function readOptionalUrl(v: unknown): string | null | "__invalid__" {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return "__invalid__";
  const trimmed = v.trim();
  if (!trimmed) return null;
  return isSafeHttpUrl(trimmed) ? trimmed : "__invalid__";
}

function readOptionalUrlArray(v: unknown): string[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (!isSafeHttpUrl(trimmed)) return null;
    out.push(trimmed);
  }
  return out;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function randomSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length]!;
  }
  return out;
}

/** Lowercase brand name, spaces → hyphens, then `-xxxx` random suffix. */
function buildSlug(brandName: string): string {
  const base = brandName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const prefix = base.length > 0 ? base : "business";
  return `${prefix}-${randomSuffix(SLUG_SUFFIX_LEN)}`;
}
