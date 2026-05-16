import { NextResponse } from "next/server";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { patchAppSettingsSingleton } from "@/lib/data/app-settings-singleton";
import { requireAdminSession } from "@/lib/require-admin-session";
import {
  normalizeSafeHttpUrl,
  normalizeSafeHttpsUrl,
  sanitizePlainText,
} from "@/lib/security/input-sanitize";

function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Branding logo: only https, validated when a non-empty string is provided. */
function isValidHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const deny = await requireAdminSession();
  if (deny) return deny;
  try {
    const settings = await getAppSettingsPublic();
    return NextResponse.json(settings, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

  const poweredRaw =
    typeof o.poweredByUrl === "string"
      ? o.poweredByUrl.trim()
      : typeof o.powered_by_url === "string"
        ? o.powered_by_url.trim()
        : "";
  if (!poweredRaw || !isSafeHttpUrl(poweredRaw)) {
    return NextResponse.json(
      { error: "Validation failed", fields: { poweredByUrl: "Enter a valid http(s) URL" } },
      { status: 400 },
    );
  }

  const poweredByStored = normalizeSafeHttpUrl(poweredRaw);
  if (!poweredByStored) {
    return NextResponse.json(
      { error: "Validation failed", fields: { poweredByUrl: "Enter a valid http(s) URL" } },
      { status: 400 },
    );
  }

  const copyrightRaw =
    typeof o.copyrightText === "string"
      ? o.copyrightText
      : typeof o.copyright_text === "string"
        ? o.copyright_text
        : "";
  if (copyrightRaw.length > 500) {
    return NextResponse.json(
      { error: "Validation failed", fields: { copyrightText: "Maximum 500 characters" } },
      { status: 400 },
    );
  }

  const copyrightText = sanitizePlainText(copyrightRaw, 500);

  const yearRaw = o.copyrightYear ?? o.copyright_year;
  let copyrightYear: number;
  if (typeof yearRaw === "number" && Number.isInteger(yearRaw)) {
    copyrightYear = yearRaw;
  } else if (typeof yearRaw === "string" && /^\d{4}$/.test(yearRaw.trim())) {
    copyrightYear = Number.parseInt(yearRaw.trim(), 10);
  } else {
    return NextResponse.json(
      { error: "Validation failed", fields: { copyrightYear: "Enter a valid 4-digit year" } },
      { status: 400 },
    );
  }
  if (copyrightYear < 1900 || copyrightYear > 2100) {
    return NextResponse.json(
      { error: "Validation failed", fields: { copyrightYear: "Year must be between 1900 and 2100" } },
      { status: 400 },
    );
  }

  const existing = await getAppSettingsPublic();
  const logoKeyPresent =
    Object.prototype.hasOwnProperty.call(o, "brandingLogoUrl") ||
    Object.prototype.hasOwnProperty.call(o, "branding_logo_url");

  let brandingLogoUrl: string | null;
  if (!logoKeyPresent) {
    brandingLogoUrl = existing.brandingLogoUrl;
  } else {
    const logoRaw = o.brandingLogoUrl ?? o.branding_logo_url;
    if (logoRaw === null || logoRaw === "") {
      brandingLogoUrl = null;
    } else if (typeof logoRaw === "string") {
      const t = logoRaw.trim();
      if (!t) {
        brandingLogoUrl = null;
      } else if (!isValidHttpsUrl(t)) {
        return NextResponse.json(
          {
            error: "Validation failed",
            fields: { brandingLogoUrl: "Must be a valid https URL" },
          },
          { status: 400 },
        );
      } else {
        brandingLogoUrl = normalizeSafeHttpsUrl(t);
      }
    } else {
      return NextResponse.json(
        { error: "Validation failed", fields: { brandingLogoUrl: "Invalid value" } },
        { status: 400 },
      );
    }
  }

  const result = await patchAppSettingsSingleton({
    branding_logo_url: brandingLogoUrl,
    powered_by_url: poweredByStored,
    copyright_text: copyrightText,
    copyright_year: copyrightYear,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.code === "42P01" ? 503 : 500 },
    );
  }

  const settings = await getAppSettingsPublic();
  return NextResponse.json({ ok: true, settings }, { status: 200 });
}
