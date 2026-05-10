import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  BUSINESS_TYPE_DUPLICATE_MESSAGE,
  isPostgresUniqueViolation,
} from "@/lib/admin/business-type-errors";
import { listBusinessTypesWithUsage } from "@/lib/data/business-types-admin";
import { requireAdminSession } from "@/lib/require-admin-session";
import { normalizeBusinessTypeSlug } from "@/lib/business/business-type-slug";
import { isUuidRouteParam } from "@/lib/validation/uuid-param";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const deny = await requireAdminSession();
  if (deny) return deny;

  const { id: rawId } = await ctx.params;
  const id = rawId?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (!isUuidRouteParam(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

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
  const name =
    o.name !== undefined && typeof o.name === "string" ? o.name.trim() : undefined;
  let slug: string | undefined;
  if (o.slug !== undefined) {
    const raw = typeof o.slug === "string" ? o.slug : "";
    slug = normalizeBusinessTypeSlug(raw);
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fields: { slug: "Invalid slug format" },
        },
        { status: 400 },
      );
    }
  }

  if (name !== undefined && (!name || name.length > 120)) {
    return NextResponse.json(
      { error: "Validation failed", fields: { name: "Name must be 1–120 characters" } },
      { status: 400 },
    );
  }

  if (name === undefined && slug === undefined) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("business_types")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing || typeof existing !== "object") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const oldSlug =
    typeof (existing as Record<string, unknown>).slug === "string"
      ? String((existing as Record<string, unknown>).slug).trim()
      : "";

  const oldKey = oldSlug.trim();

  const nextSlug = slug ?? oldSlug;
  const nextName =
    name ??
    (typeof (existing as Record<string, unknown>).name === "string"
      ? String((existing as Record<string, unknown>).name)
      : "");

  if (slug !== undefined && slug !== oldKey) {
    const { data: clash } = await supabase
      .from("business_types")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ error: BUSINESS_TYPE_DUPLICATE_MESSAGE }, { status: 409 });
    }

    const { error: migrateErr } = await supabase
      .from("businesses")
      .update({ business_type: slug })
      .eq("business_type", oldKey);

    if (migrateErr) {
      return NextResponse.json({ error: migrateErr.message }, { status: 500 });
    }
  }

  const { data: updated, error: updErr } = await supabase
    .from("business_types")
    .update({
      ...(slug !== undefined ? { slug: nextSlug } : {}),
      ...(name !== undefined ? { name: nextName } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, slug, name")
    .single();

  if (updErr) {
    if (isPostgresUniqueViolation(updErr)) {
      return NextResponse.json({ error: BUSINESS_TYPE_DUPLICATE_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { types } = await listBusinessTypesWithUsage();
  const row = types.find((t) => t.id === id);

  return NextResponse.json({ ok: true, type: updated, usageCount: row?.usageCount ?? 0 }, { status: 200 });
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const deny = await requireAdminSession();
  if (deny) return deny;

  const { id: rawId } = await ctx.params;
  const id = rawId?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (!isUuidRouteParam(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: row, error: fetchErr } = await supabase
    .from("business_types")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row || typeof row !== "object") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slug =
    typeof (row as Record<string, unknown>).slug === "string"
      ? String((row as Record<string, unknown>).slug).trim()
      : "";

  const { count, error: countErr } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("business_type", slug);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "This type is assigned to one or more businesses and cannot be deleted.",
        usageCount: count,
      },
      { status: 409 },
    );
  }

  const { error: delErr } = await supabase.from("business_types").delete().eq("id", id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
