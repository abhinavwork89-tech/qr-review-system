import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeBusinessTypeSlug } from "@/lib/business/business-type-slug";

export type BusinessTypeOption = {
  id: string;
  slug: string;
  name: string;
  usageCount: number;
};

/**
 * Types from `business_types` with usage counts from `businesses.business_type` (slug match).
 */
export async function listBusinessTypesWithUsage(): Promise<{
  types: BusinessTypeOption[];
  error: string | null;
}> {
  const supabase = createServiceRoleClient();
  const [{ data: typeRows, error: typesError }, { data: businesses, error: bizError }] =
    await Promise.all([
      supabase
        .from("business_types")
        .select("id, slug, name")
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .limit(2000),
      supabase.from("businesses").select("business_type").limit(50000),
    ]);

  if (typesError) {
    return { types: [], error: typesError.message };
  }

  const counts = new Map<string, number>();
  if (!bizError) {
    for (const r of businesses ?? []) {
      const o = r as Record<string, unknown>;
      const raw = typeof o.business_type === "string" ? o.business_type : "";
      const t = normalizeBusinessTypeSlug(raw) || raw.trim().toLowerCase();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  const types: BusinessTypeOption[] = (typeRows ?? [])
    .map((row) => {
      const o = row as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id.trim() : "";
      const rawSlug = typeof o.slug === "string" ? o.slug : "";
      const slug = rawSlug.trim();
      const name = typeof o.name === "string" ? o.name.trim() : "";
      const countKey =
        normalizeBusinessTypeSlug(rawSlug) ||
        slug.toLowerCase().replace(/\s+/g, "-") ||
        normalizeBusinessTypeSlug(name);
      return {
        id,
        slug,
        name,
        usageCount: countKey ? (counts.get(countKey) ?? 0) : 0,
      };
    })
    .filter((t) => t.id.length > 0);

  if (bizError) {
    console.error("listBusinessTypesWithUsage: businesses query failed", bizError.message);
  }

  return { types, error: null };
}

/** For Add Business & filter dropdowns: slug + display name. */
export async function listBusinessTypeSelectOptions(): Promise<{
  options: { slug: string; name: string }[];
  error: string | null;
}> {
  const { types, error } = await listBusinessTypesWithUsage();
  if (error) return { options: [], error };
  return {
    options: types.map((t) => ({ slug: t.slug, name: t.name })),
    error: null,
  };
}
