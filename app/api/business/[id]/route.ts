import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { schedulePatchLifecycleEmails } from "@/lib/email/lifecycle-triggers";
import {
  finalizeIdentityForDb,
  getIdentityDocumentErrors,
  getIdentityFieldErrors,
  mergeIdentityFromPatchAndRow,
} from "@/lib/business/identity";
import { sanitizeBusinessPatchRecord } from "@/lib/security/input-sanitize";
import { normalizeDialCode } from "@/lib/phone/mobile";
import {
  clampWhatsAppLocalInput,
  finalizeWhatsAppForPersist,
  validateWhatsAppLocalForDial,
} from "@/lib/whatsapp/wa-me";
import {
  finalizeCallForPersist,
  getCallFormErrors,
  clampCallLocalInput,
} from "@/lib/call/call-channel";
import {
  normalizeMasterQrType,
  resolvePersistedMasterQrType,
  validateMasterQrForPersist,
  type MasterQrType,
} from "@/lib/scan/master-qr";

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

    const bodyObj =
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;

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
        "id,status,is_active,plan_type,name,brand_name,email,logo_url,primary_color,slug,identity_type,identity_number,identity_proof_urls,client_photo_url,channels,whatsapp_country_code,whatsapp_number,google_url,master_qr_type,call_enabled,call_country_code,call_number",
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

    let rawPatch: Record<string, unknown> = { ...parsed.data };
    if ("identity_type" in rawPatch || "identity_number" in rawPatch) {
      const merged = mergeIdentityFromPatchAndRow(
        rawPatch,
        currentRow as Record<string, unknown>,
      );
      const idErr = getIdentityFieldErrors(merged.typeSlug, merged.numberRaw);
      if (Object.keys(idErr).length > 0) {
        return NextResponse.json(
          { error: "Validation failed", fields: idErr },
          { status: 400 },
        );
      }
      const fin = finalizeIdentityForDb(merged.typeSlug ?? "", merged.numberRaw);
      rawPatch = { ...rawPatch, identity_type: fin.identity_type, identity_number: fin.identity_number };
    }

    const mergedId = mergeIdentityFromPatchAndRow(
      rawPatch,
      currentRow as Record<string, unknown>,
    );
    const identityFinal = finalizeIdentityForDb(mergedId.typeSlug ?? "", mergedId.numberRaw);
    if (identityFinal.identity_type && identityFinal.identity_number) {
      const mergedProof = proofUrlsAfterPatch(
        rawPatch,
        currentRow as Record<string, unknown>,
      );
      const mergedClient = clientPhotoAfterPatch(
        rawPatch,
        currentRow as Record<string, unknown>,
      );
      const docErr = getIdentityDocumentErrors({
        identityProofUrlCount: mergedProof.length,
        clientPhotoUrlPresent: Boolean(mergedClient && mergedClient.trim()),
      });
      if (Object.keys(docErr).length > 0) {
        return NextResponse.json(
          { error: "Validation failed", fields: docErr },
          { status: 400 },
        );
      }
    }

    if (
      "channels" in rawPatch ||
      "whatsapp_country_code" in rawPatch ||
      "whatsapp_number" in rawPatch
    ) {
      const currentChannelsRaw = currentRow.channels;
      const currentChannels =
        currentChannelsRaw &&
        typeof currentChannelsRaw === "object" &&
        !Array.isArray(currentChannelsRaw)
          ? ({ ...(currentChannelsRaw as Record<string, unknown>) } as Record<string, unknown>)
          : null;
      const patchChannelsRaw = rawPatch.channels;
      const patchChannels =
        patchChannelsRaw &&
        typeof patchChannelsRaw === "object" &&
        !Array.isArray(patchChannelsRaw)
          ? (patchChannelsRaw as Record<string, unknown>)
          : null;
      const mergedChannels = patchChannels
        ? { ...(currentChannels ?? {}), ...patchChannels }
        : currentChannels;

      if (mergedChannels === null || typeof mergedChannels !== "object") {
        return NextResponse.json(
          {
            error: "Validation failed",
            fields: {
              channels: "Channel configuration is missing; save channels before updating WhatsApp.",
            },
          },
          { status: 400 },
        );
      }

      const waCcRaw =
        typeof rawPatch.whatsapp_country_code === "string"
          ? (rawPatch.whatsapp_country_code as string)
          : typeof currentRow.whatsapp_country_code === "string"
            ? currentRow.whatsapp_country_code
            : "";
      const waNumRaw =
        typeof rawPatch.whatsapp_number === "string"
          ? (rawPatch.whatsapp_number as string)
          : typeof currentRow.whatsapp_number === "string"
            ? currentRow.whatsapp_number
            : "";

      const waSub =
        mergedChannels &&
        typeof mergedChannels.whatsapp === "object" &&
        mergedChannels.whatsapp !== null &&
        !Array.isArray(mergedChannels.whatsapp)
          ? (mergedChannels.whatsapp as Record<string, unknown>)
          : null;
      const waEnabled = waSub?.enabled === true;
      const waFields: Record<string, string> = {};
      if (waEnabled) {
        const cc = normalizeDialCode(waCcRaw || "+91");
        const digits = clampWhatsAppLocalInput(waNumRaw);
        const waErr = validateWhatsAppLocalForDial(cc, digits);
        if (waErr) waFields.whatsapp_number = waErr;
      }
      if (Object.keys(waFields).length > 0) {
        return NextResponse.json(
          { error: "Validation failed", fields: waFields },
          { status: 400 },
        );
      }
      const fin = finalizeWhatsAppForPersist(mergedChannels, waCcRaw || "+91", waNumRaw);
      rawPatch = {
        ...rawPatch,
        channels: fin.channels,
        whatsapp_country_code: fin.whatsapp_country_code,
        whatsapp_number: fin.whatsapp_number,
      };
    }

    if (
      bodyObj &&
      ("call_enabled" in bodyObj ||
        "callEnabled" in bodyObj ||
        "call_country_code" in bodyObj ||
        "callCountryCode" in bodyObj ||
        "call_number" in bodyObj ||
        "callNumber" in bodyObj)
    ) {
      const cur = currentRow as Record<string, unknown>;
      const mergedCallEnabled =
        typeof rawPatch.call_enabled === "boolean"
          ? (rawPatch.call_enabled as boolean)
          : readBool(cur.call_enabled, false);
      const mergedCallCcRaw =
        typeof rawPatch.call_country_code === "string"
          ? (rawPatch.call_country_code as string)
          : typeof cur.call_country_code === "string"
            ? String(cur.call_country_code)
            : "91";
      const mergedCallNumRaw =
        typeof rawPatch.call_number === "string"
          ? (rawPatch.call_number as string)
          : typeof cur.call_number === "string"
            ? String(cur.call_number)
            : "";
      const dial = normalizeDialCode(mergedCallCcRaw || "+91");
      const callErrs = getCallFormErrors({
        enabled: mergedCallEnabled,
        countryDialRaw: dial,
        localRaw: mergedCallNumRaw,
      });
      if (Object.keys(callErrs).length > 0) {
        const callFields: Record<string, string> = {};
        if (callErrs.callCountryCode) callFields.call_country_code = callErrs.callCountryCode;
        if (callErrs.callNumber) callFields.call_number = callErrs.callNumber;
        return NextResponse.json(
          { error: "Validation failed", fields: callFields },
          { status: 400 },
        );
      }
      const callFin = finalizeCallForPersist(mergedCallEnabled, dial, mergedCallNumRaw);
      rawPatch = {
        ...rawPatch,
        call_enabled: callFin.call_enabled,
        call_country_code: callFin.call_country_code,
        call_number: callFin.call_number,
      };
    }

    const affectsMasterContext =
      bodyObj &&
      ("channels" in bodyObj ||
        "google_url" in bodyObj ||
        "whatsapp_country_code" in bodyObj ||
        "whatsapp_number" in bodyObj ||
        "whatsappCountryCode" in bodyObj ||
        "whatsappNumber" in bodyObj);

    const masterProvided =
      bodyObj &&
      ("master_qr_type" in bodyObj || "masterQrType" in bodyObj);

    const mergedGoogle =
      typeof rawPatch.google_url === "string"
        ? rawPatch.google_url
        : typeof (currentRow as { google_url?: unknown }).google_url === "string"
          ? String((currentRow as { google_url: string }).google_url)
          : "";

    const mergedChannels =
      rawPatch.channels !== undefined ? rawPatch.channels : currentRow.channels;

    const mergedWaCc =
      rawPatch.whatsapp_country_code !== undefined
        ? rawPatch.whatsapp_country_code
        : currentRow.whatsapp_country_code;
    const mergedWaNum =
      rawPatch.whatsapp_number !== undefined
        ? rawPatch.whatsapp_number
        : currentRow.whatsapp_number;

    const masterBase = {
      google_url: mergedGoogle || null,
      channels: mergedChannels as unknown,
      whatsapp_country_code:
        mergedWaCc === null || mergedWaCc === undefined
          ? null
          : typeof mergedWaCc === "string"
            ? mergedWaCc
            : null,
      whatsapp_number:
        mergedWaNum === null || mergedWaNum === undefined
          ? null
          : typeof mergedWaNum === "string"
            ? mergedWaNum
            : null,
    };

    if (masterProvided) {
      const rawWant =
        typeof rawPatch.master_qr_type === "string"
          ? rawPatch.master_qr_type
          : typeof bodyObj?.masterQrType === "string"
            ? bodyObj.masterQrType
            : "";
      const want = normalizeMasterQrType(rawWant);
      if (!want) {
        return NextResponse.json(
          { error: "Validation failed", fields: { master_qr_type: "Invalid Master QR type" } },
          { status: 400 },
        );
      }
      const err = validateMasterQrForPersist({ ...masterBase, master_qr_type: want });
      if (err) {
        return NextResponse.json(
          { error: "Validation failed", fields: { master_qr_type: err } },
          { status: 400 },
        );
      }
      rawPatch.master_qr_type = want;
    } else if (affectsMasterContext) {
      const preferredCurrent =
        typeof (currentRow as { master_qr_type?: unknown }).master_qr_type === "string"
          ? (currentRow as { master_qr_type: string }).master_qr_type
          : null;
      const nextMaster: MasterQrType | null = resolvePersistedMasterQrType(
        masterBase,
        preferredCurrent,
      );
      const prevNorm = normalizeMasterQrType(preferredCurrent);
      if (nextMaster !== prevNorm) {
        rawPatch.master_qr_type = nextMaster;
      }
    }

    const patch = sanitizeBusinessPatchRecord(rawPatch);

    const { data, error } = await supabase
      .from("businesses")
      .update(patch)
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
      patch,
    });

    return NextResponse.json(
      {
        ok: true,
        ...("master_qr_type" in rawPatch
          ? { master_qr_type: (rawPatch.master_qr_type ?? null) as MasterQrType | null }
          : {}),
      },
      { status: 200 },
    );
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

function proofUrlsFromRow(row: Record<string, unknown>): string[] {
  return readOptionalUrlArray(row.identity_proof_urls) ?? [];
}

function proofUrlsAfterPatch(
  patch: Record<string, unknown>,
  row: Record<string, unknown>,
): string[] {
  if ("identity_proof_urls" in patch && Array.isArray(patch.identity_proof_urls)) {
    return patch.identity_proof_urls.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
  }
  return proofUrlsFromRow(row);
}

function clientPhotoAfterPatch(
  patch: Record<string, unknown>,
  row: Record<string, unknown>,
): string | null {
  if ("client_photo_url" in patch) {
    const v = patch.client_photo_url;
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "string") {
      const t = v.trim();
      return t.length > 0 && isSafeHttpUrl(t) ? t : null;
    }
    return null;
  }
  const c = row.client_photo_url;
  return typeof c === "string" && c.trim().length > 0 && isSafeHttpUrl(c.trim())
    ? c.trim()
    : null;
}

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

  if ("mobile" in patch) {
    const mobile = patch.mobile as string;
    if (mobile.length === 0 || !isValidMobile(mobile)) {
      fields.mobile = "Invalid mobile";
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
    if (parsedThreshold !== null && (parsedThreshold < 1 || parsedThreshold > 5)) {
      fields.threshold = "Must be from 1 to 5";
    } else if (parsedThreshold !== null) {
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

  if ("identity_proof_urls" in input || "identityProofUrls" in input) {
    const raw =
      "identity_proof_urls" in input ? input.identity_proof_urls : input.identityProofUrls;
    const proofUrls = readOptionalUrlArray(raw);
    if (proofUrls === null) {
      fields.identity_proof_urls = "Must be an array of valid URLs";
    } else {
      patch.identity_proof_urls = proofUrls;
    }
  }

  if ("client_photo_url" in input) {
    const clientUrl = readOptionalUrl(input.client_photo_url);
    if (clientUrl === "__invalid__") {
      fields.client_photo_url = "Must be a valid URL";
    } else {
      patch.client_photo_url = clientUrl;
    }
  } else if ("clientPhotoUrl" in input) {
    const clientUrl = readOptionalUrl(input.clientPhotoUrl);
    if (clientUrl === "__invalid__") {
      fields.client_photo_url = "Must be a valid URL";
    } else {
      patch.client_photo_url = clientUrl;
    }
  }

  if ("whatsapp_country_code" in input) {
    const v = input.whatsapp_country_code;
    if (v === null || v === undefined || v === "") patch.whatsapp_country_code = null;
    else if (typeof v === "string") patch.whatsapp_country_code = v.trim();
    else fields.whatsapp_country_code = "Must be a string or null";
  } else if ("whatsappCountryCode" in input) {
    const v = input.whatsappCountryCode;
    if (v === null || v === undefined || v === "") patch.whatsapp_country_code = null;
    else if (typeof v === "string") patch.whatsapp_country_code = v.trim();
    else fields.whatsapp_country_code = "Must be a string or null";
  }

  if ("whatsapp_number" in input) {
    const v = input.whatsapp_number;
    if (v === null || v === undefined || v === "") patch.whatsapp_number = null;
    else if (typeof v === "string") patch.whatsapp_number = clampWhatsAppLocalInput(v);
    else fields.whatsapp_number = "Must be a string or null";
  } else if ("whatsappNumber" in input) {
    const v = input.whatsappNumber;
    if (v === null || v === undefined || v === "") patch.whatsapp_number = null;
    else if (typeof v === "string") patch.whatsapp_number = clampWhatsAppLocalInput(v);
    else fields.whatsapp_number = "Must be a string or null";
  }

  if ("call_enabled" in input) {
    const v = input.call_enabled;
    if (typeof v === "boolean") {
      patch.call_enabled = v;
    } else if (v === "true" || v === "false") {
      patch.call_enabled = v === "true";
    } else {
      fields.call_enabled = "Must be a boolean";
    }
  } else if ("callEnabled" in input) {
    const v = input.callEnabled;
    if (typeof v === "boolean") {
      patch.call_enabled = v;
    } else if (v === "true" || v === "false") {
      patch.call_enabled = v === "true";
    } else {
      fields.call_enabled = "Must be a boolean";
    }
  }

  if ("call_country_code" in input) {
    const v = input.call_country_code;
    if (v === null || v === undefined || v === "") patch.call_country_code = "91";
    else if (typeof v === "string") patch.call_country_code = v.trim();
    else fields.call_country_code = "Must be a string or null";
  } else if ("callCountryCode" in input) {
    const v = input.callCountryCode;
    if (v === null || v === undefined || v === "") patch.call_country_code = "91";
    else if (typeof v === "string") patch.call_country_code = v.trim();
    else fields.call_country_code = "Must be a string or null";
  }

  if ("call_number" in input) {
    const v = input.call_number;
    if (v === null || v === undefined || v === "") patch.call_number = null;
    else if (typeof v === "string") patch.call_number = clampCallLocalInput(v) || null;
    else fields.call_number = "Must be a string or null";
  } else if ("callNumber" in input) {
    const v = input.callNumber;
    if (v === null || v === undefined || v === "") patch.call_number = null;
    else if (typeof v === "string") patch.call_number = clampCallLocalInput(v) || null;
    else fields.call_number = "Must be a string or null";
  }

  if ("identity_type" in input) {
    const v = input.identity_type;
    if (v === null || v === undefined || v === "") patch.identity_type = null;
    else if (typeof v === "string") patch.identity_type = v.trim();
    else fields.identity_type = "Must be a string or null";
  } else if ("identityType" in input) {
    const v = input.identityType;
    if (v === null || v === undefined || v === "") patch.identity_type = null;
    else if (typeof v === "string") patch.identity_type = v.trim();
    else fields.identity_type = "Must be a string or null";
  }

  if ("identity_number" in input) {
    const v = input.identity_number;
    if (v === null || v === undefined || v === "") patch.identity_number = null;
    else if (typeof v === "string") patch.identity_number = v.trim();
    else fields.identity_number = "Must be a string";
  } else if ("identityNumber" in input) {
    const v = input.identityNumber;
    if (v === null || v === undefined || v === "") patch.identity_number = null;
    else if (typeof v === "string") patch.identity_number = v.trim();
    else fields.identity_number = "Must be a string";
  }

  if ("master_qr_type" in input || "masterQrType" in input) {
    const raw = "master_qr_type" in input ? input.master_qr_type : input.masterQrType;
    if (typeof raw !== "string") {
      fields.master_qr_type = "Must be a string";
    } else {
      const t = raw.trim();
      if (!normalizeMasterQrType(t)) {
        fields.master_qr_type = "Invalid Master QR type";
      } else {
        patch.master_qr_type = t;
      }
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

