import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const SLUG_SUFFIX_LEN = 4;
const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBusinessBody(json);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fields: parsed.fields },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    const row = parsed.data;

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
        })
        .select("id")
        .single();

      if (!error && data) {
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
};

type ParseOk = { ok: true; data: BusinessInsertPayload };
type ParseErr = {
  ok: false;
  error: string;
  fields?: Record<string, string>;
};

function parseBusinessBody(body: unknown): ParseOk | ParseErr {
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
  const google_url = readTrimmedString(o.google_url);

  if (!name) fields.name = "Required";
  if (!email) fields.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fields.email = "Invalid email";
  if (!mobile) fields.mobile = "Required";
  if (!brand_name) fields.brand_name = "Required";
  if (!primary_color) fields.primary_color = "Required";
  if (!secondary_color) fields.secondary_color = "Required";
  if (!language) fields.language = "Required";
  if (!plan_type) fields.plan_type = "Required";
  if (!google_url) fields.google_url = "Required";

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
  if (!fields.threshold && threshold !== 3 && threshold !== 4) {
    fields.threshold = "Must be 3 or 4";
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

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Validation failed", fields };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      mobile,
      brand_name,
      primary_color,
      secondary_color,
      language,
      plan_type,
      google_url,
      threshold,
      direct_redirect,
      allow_low_rating_redirect,
      channels,
      logo_url: logo_url === "__invalid__" ? null : logo_url,
      banner_urls: banner_urls ?? [],
      resource_urls: resource_urls ?? [],
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
