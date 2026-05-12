import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  BUSINESS_TYPE_DUPLICATE_MESSAGE,
  isPostgresUniqueViolation,
} from "@/lib/admin/business-type-errors";
import { normalizeBusinessTypeSlug } from "@/lib/business/business-type-slug";
import { listBusinessTypesWithUsage } from "@/lib/data/business-types-admin";
import { requireAdminSession } from "@/lib/require-admin-session";
import { sanitizePlainText } from "@/lib/security/input-sanitize";

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;

  const { types, error } = await listBusinessTypesWithUsage();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ types }, { status: 200 });
}

export async function POST(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const o = json as Record<string, unknown>;
  const name = sanitizePlainText(typeof o.name === "string" ? o.name : "", 120);
  const slugInput = typeof o.slug === "string" ? o.slug : "";
  const slug = normalizeBusinessTypeSlug(slugInput || name);

  if (!name || name.length > 120) {
    return NextResponse.json(
      { error: "Validation failed", fields: { name: "Name is required (max 120 characters)" } },
      { status: 400 },
    );
  }
  if (!slug || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fields: {
          slug:
            "Use lowercase letters, numbers, and single hyphens only (e.g. retail, fine-dining)",
        },
      },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  const { data: existingSlug } = await supabase
    .from("business_types")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingSlug) {
    return NextResponse.json({ error: BUSINESS_TYPE_DUPLICATE_MESSAGE }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("business_types")
    .insert({ slug, name, updated_at: new Date().toISOString() })
    .select("id, slug, name")
    .single();

  if (error) {
    if (isPostgresUniqueViolation(error)) {
      return NextResponse.json({ error: BUSINESS_TYPE_DUPLICATE_MESSAGE }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.code === "42P01" ? 503 : 500 },
    );
  }

  return NextResponse.json({ ok: true, type: data }, { status: 201 });
}
