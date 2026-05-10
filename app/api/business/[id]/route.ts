import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { schedulePatchLifecycleEmails } from "@/lib/email/lifecycle-triggers";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const businessId = id?.trim();
    if (!businessId) {
      return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("businesses")
      .update({ is_active: false, status: "deleted" })
      .eq("id", businessId)
      .select("id")
      .maybeSingle();

    if (error) {
      const status = error.code === "23503" ? 409 : 500;
      return NextResponse.json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
        },
        { status },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const businessId = id?.trim();
    if (!businessId) {
      return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBusinessPatchBody(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fields: parsed.fields },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    const { data: currentRow, error: currentError } = await supabase
      .from("businesses")
      .select(
        "id,status,is_active,plan_type,name,brand_name,email,logo_url,primary_color,slug",
      )
      .eq("id", businessId)
      .maybeSingle();
    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }
    if (!currentRow) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    const currentStatus = normalizeBusinessStatus(currentRow as Record<string, unknown>);
    if (currentStatus === "deleted") {
      return NextResponse.json({ error: "Deleted business cannot be modified" }, { status: 410 });
    }

    const { data, error } = await supabase
      .from("businesses")
      .update(parsed.data)
      .eq("id", businessId)
      .select("id")
      .maybeSingle();

    if (error) {
      const status =
        error.code === "23503" || error.code === "23514" ? 400 : 500;
      return NextResponse.json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
        },
        { status },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    schedulePatchLifecycleEmails({
      businessId,
      before: currentRow as Record<string, unknown>,
      patch: parsed.data,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ParseOk = { ok: true; data: Record<string, unknown> };
type ParseErr = {
  ok: false;
  error: string;
  fields?: Record<string, string>;
};

function parseBusinessPatchBody(body: unknown): ParseOk | ParseErr {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const input = body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const patch: Record<string, unknown> = {};

  const stringFields = [
    "name",
    "email",
    "mobile",
    "brand_name",
    "primary_color",
    "secondary_color",
    "language",
    "plan_type",
    "google_url",
    "business_type",
  ] as const;

  for (const key of stringFields) {
    if (!(key in input)) continue;
    const value = input[key];
    if (typeof value !== "string") {
      fields[key] = "Must be a string";
      continue;
    }
    patch[key] = value.trim();
  }

  if ("email" in patch) {
    const email = patch.email as string;
    if (email.length === 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fields.email = "Invalid email";
    }
  }

  if ("threshold" in input) {
    const raw = input.threshold;
    let parsedThreshold: number | null = null;
    if (typeof raw === "number" && Number.isInteger(raw)) {
      parsedThreshold = raw;
    } else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
      parsedThreshold = Number.parseInt(raw.trim(), 10);
    }
    if (parsedThreshold !== 3 && parsedThreshold !== 4) {
      fields.threshold = "Must be 3 or 4";
    } else {
      patch.threshold = parsedThreshold;
    }
  }

  const boolFields = ["allow_low_rating_redirect", "direct_redirect"] as const;
  for (const key of boolFields) {
    if (!(key in input)) continue;
    const value = input[key];
    if (typeof value === "boolean") {
      patch[key] = value;
      continue;
    }
    if (value === "true" || value === "false") {
      patch[key] = value === "true";
      continue;
    }
    fields[key] = "Must be a boolean";
  }

  if ("status" in input) {
    const raw = input.status;
    if (raw === "active" || raw === "inactive" || raw === "deleted") {
      patch.status = raw;
      patch.is_active = isBusinessActiveStatus(raw);
    } else {
      fields.status = 'Must be one of: "active", "inactive", "deleted"';
    }
  }

  if ("is_active" in input) {
    const value = input.is_active;
    if (typeof value !== "boolean") {
      fields.is_active = "Must be a boolean";
    } else if (!("status" in patch)) {
      patch.is_active = value;
      patch.status = value ? "active" : "inactive";
    }
  }

  if ("channels" in input) {
    if (typeof input.channels === "object" && input.channels !== null && !Array.isArray(input.channels)) {
      const channels = input.channels as Record<string, unknown>;
      patch.channels = {
        ...channels,
        spin_enabled: channels.spin_enabled === true,
        scratch_enabled: channels.scratch_enabled === true,
        reward_config: normalizeRewardConfig(channels.reward_config),
      };
    } else {
      fields.channels = "Must be an object";
    }
  }

  if ("logo_url" in input) {
    const logoUrl = readOptionalUrl(input.logo_url);
    if (logoUrl === "__invalid__") {
      fields.logo_url = "Must be a valid URL";
    } else {
      patch.logo_url = logoUrl;
    }
  }

  if ("banner_urls" in input) {
    const bannerUrls = readOptionalUrlArray(input.banner_urls);
    if (bannerUrls === null) {
      fields.banner_urls = "Must be an array of valid URLs";
    } else {
      patch.banner_urls = bannerUrls;
    }
  }

  if ("resource_urls" in input) {
    const resourceUrls = readOptionalUrlArray(input.resource_urls);
    if (resourceUrls === null) {
      fields.resource_urls = "Must be an array of valid URLs";
    } else {
      patch.resource_urls = resourceUrls;
    }
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Validation failed", fields };
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No editable fields provided" };
  }

  return { ok: true, data: patch };
}

function normalizeRewardConfig(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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

