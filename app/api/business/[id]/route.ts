import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

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
      .update({ is_active: false })
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

