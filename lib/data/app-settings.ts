import { createServiceRoleClient } from "@/lib/supabase/server";

export type AppSettingsPublic = {
  brandingLogoUrl: string | null;
  poweredByUrl: string;
  copyrightText: string;
  copyrightYear: number;
};

const DEFAULTS: AppSettingsPublic = {
  brandingLogoUrl: null,
  poweredByUrl: "https://onecore.example",
  copyrightText: "",
  copyrightYear: new Date().getUTCFullYear(),
};

function rowToPublic(r: Record<string, unknown> | null): AppSettingsPublic {
  if (!r) return { ...DEFAULTS };
  const yearRaw = r.copyright_year;
  let y = DEFAULTS.copyrightYear;
  if (typeof yearRaw === "number" && Number.isFinite(yearRaw)) y = yearRaw;
  else if (typeof yearRaw === "string" && /^\d{4}$/.test(yearRaw)) {
    y = Number.parseInt(yearRaw, 10);
  }
  return {
    brandingLogoUrl:
      typeof r.branding_logo_url === "string" && r.branding_logo_url.trim()
        ? r.branding_logo_url.trim()
        : null,
    poweredByUrl:
      typeof r.powered_by_url === "string" && r.powered_by_url.trim()
        ? r.powered_by_url.trim()
        : DEFAULTS.poweredByUrl,
    copyrightText:
      typeof r.copyright_text === "string" ? r.copyright_text : DEFAULTS.copyrightText,
    copyrightYear: y,
  };
}

export async function getAppSettingsPublic(): Promise<AppSettingsPublic> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("branding_logo_url, powered_by_url, copyright_text, copyright_year")
      .limit(1)
      .maybeSingle();
    if (error) {
      const missing =
        /could not find the table/i.test(error.message) ||
        error.code === "PGRST205" ||
        error.code === "42P01";
      if (!missing) {
        console.error("getAppSettingsPublic", error.message);
      }
      return { ...DEFAULTS };
    }
    return rowToPublic((data ?? null) as Record<string, unknown> | null);
  } catch {
    return { ...DEFAULTS };
  }
}
