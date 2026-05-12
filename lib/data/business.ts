import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { normalizeMasterQrType } from "@/lib/scan/master-qr";
import type {
  ActiveBusiness,
  BusinessRow,
  InactiveBusinessForReview,
} from "@/lib/types/business";

export type GetBusinessBySlugResult =
  | { status: "ok"; business: ActiveBusiness }
  | { status: "not_found" }
  | { status: "inactive"; business: InactiveBusinessForReview };

export async function fetchBusinessBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<GetBusinessBySlugResult> {
  // Use `*` so missing optional columns in older DBs do not cause Postgres 42703
  // ("undefined_column") when the schema is behind the TypeScript model.
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { status: "not_found" };
  }

  const row = coerceBusinessRow(data as Record<string, unknown>);
  if (!row.slug || !row.id) {
    return { status: "not_found" };
  }

  if (!isBusinessActiveStatus(row.status)) {
    return {
      status: "inactive",
      business: {
        name: row.name,
        brand_name: row.brand_name,
        logo_url: row.logo_url,
        theme_primary: row.theme_primary,
        theme_background: row.theme_background,
        theme_foreground: row.theme_foreground,
        primary_color: row.primary_color,
        secondary_color: row.secondary_color,
      },
    };
  }

  return { status: "ok", business: row as ActiveBusiness };
}

function coerceBusinessRow(raw: Record<string, unknown>): BusinessRow {
  const bannerRaw =
    raw.banner_urls !== undefined && raw.banner_urls !== null
      ? raw.banner_urls
      : raw.banner_url;

  return {
    id: readString(raw.id),
    slug: readString(raw.slug),
    name: readString(raw.name),
    brand_name: readNullableString(raw.brand_name),
    logo_url: readNullableString(raw.logo_url),
    status: normalizeBusinessStatus(raw),
    is_active: readBoolean(raw.is_active, true),
    theme_primary: readNullableString(raw.theme_primary),
    theme_background: readNullableString(raw.theme_background),
    theme_foreground: readNullableString(raw.theme_foreground),
    primary_color: readNullableString(raw.primary_color),
    secondary_color: readNullableString(raw.secondary_color),
    language: readNullableString(raw.language),
    google_url: readNullableString(raw.google_url),
    threshold: readNumberOrNull(raw.threshold),
    direct_redirect: readNullableBoolean(raw.direct_redirect),
    allow_low_rating_redirect: readNullableBoolean(
      raw.allow_low_rating_redirect,
    ),
    customer_care_number: readNullableString(raw.customer_care_number),
    whatsapp_country_code: readNullableString(raw.whatsapp_country_code),
    whatsapp_number: readNullableString(raw.whatsapp_number),
    call_enabled: readNullableBoolean(raw.call_enabled),
    call_country_code: readNullableString(raw.call_country_code),
    call_number: readNullableString(raw.call_number),
    channels: raw.channels,
    banner_urls: bannerRaw,
    resource_urls: raw.resource_urls,
    master_qr_type: normalizeMasterQrType(raw.master_qr_type),
  };
}

function readString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readNullableString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return null;
}

function readBoolean(v: unknown, defaultValue: boolean): boolean {
  if (typeof v === "boolean") return v;
  return defaultValue;
}

function readNullableBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined) return null;
  return null;
}

function readNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    return Number(v.trim());
  }
  return null;
}

export const getBusinessBySlug = cache(async (slug: string) => {
  const supabase = createServiceRoleClient();
  return fetchBusinessBySlug(supabase, slug);
});
