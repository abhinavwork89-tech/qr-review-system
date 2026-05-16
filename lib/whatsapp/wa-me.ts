import { normalizeDialCode, sanitizePhoneLocalInput, splitPhoneNumber } from "@/lib/phone/mobile";

const WA_ME_BASE = "https://wa.me";

/** National significant number (digits only, excluding country dial). */
export const WHATSAPP_LOCAL_MIN_LEN = 8;
export const WHATSAPP_LOCAL_MAX_LEN = 15;

/** Digits only, spaces stripped, max length enforced (typing + paste). */
export function clampWhatsAppLocalInput(raw: string): string {
  return sanitizePhoneLocalInput(raw).slice(0, WHATSAPP_LOCAL_MAX_LEN);
}

/** Digits only for wa.me path (country + national, no +). */
export function buildWhatsAppWaMeDigits(countryDial: string, localDigits: string): string | null {
  const dial = normalizeDialCode(countryDial);
  const national = clampWhatsAppLocalInput(localDigits);
  if (!national) return null;
  const cc = dial.replace(/\D/g, "");
  if (!cc) return null;
  return `${cc}${national}`;
}

export function buildWhatsAppWaMeUrl(countryDial: string, localDigits: string): string | null {
  const digits = buildWhatsAppWaMeDigits(countryDial, localDigits);
  if (!digits) return null;
  return `${WA_ME_BASE}/${digits}`;
}

export function validateWhatsAppLocalForDial(
  countryDial: string,
  localDigits: string,
): string | null {
  const dial = normalizeDialCode(countryDial);
  const n = clampWhatsAppLocalInput(localDigits);
  if (!n) return "WhatsApp number is required when this channel is enabled.";
  if (dial === "+91") {
    if (!/^[6-9]\d{9}$/.test(n)) {
      return "Enter a valid 10-digit Indian mobile number (numbers only).";
    }
    return null;
  }
  if (n.length < WHATSAPP_LOCAL_MIN_LEN || n.length > WHATSAPP_LOCAL_MAX_LEN) {
    return `Enter a valid phone number (${WHATSAPP_LOCAL_MIN_LEN}–${WHATSAPP_LOCAL_MAX_LEN} digits).`;
  }
  return null;
}

/** Inline + submit validation for admin WhatsApp fields (shared Add / Edit). */
export type WhatsAppFormFieldErrors = {
  whatsappCountryCode?: string;
  whatsappNumber?: string;
};

export function getWhatsAppFormErrors(input: {
  enabled: boolean;
  countryDialRaw: string;
  localRaw: string;
}): WhatsAppFormFieldErrors {
  if (!input.enabled) return {};
  const ccTrim = (input.countryDialRaw ?? "").trim();
  if (!ccTrim) {
    return {
      whatsappCountryCode: "Country code is required when WhatsApp is enabled.",
    };
  }
  const dialDigits = ccTrim.replace(/\D/g, "");
  if (!dialDigits) {
    return {
      whatsappCountryCode: "Country code must include digits (e.g. +91).",
    };
  }
  const cc = normalizeDialCode(ccTrim);
  const localMsg = validateWhatsAppLocalForDial(cc, input.localRaw);
  if (localMsg) return { whatsappNumber: localMsg };
  return {};
}

/** Prefer DB columns; fall back to legacy `channels.whatsapp.url` if it is a usable https URL. */
export function resolveWhatsAppHttpsUrl(input: {
  countryCode: string | null | undefined;
  localNumber: string | null | undefined;
  legacyChannelUrl: string | null | undefined;
  channelEnabled?: boolean;
}): string {
  if (input.channelEnabled === false) return "";
  const gen = buildWhatsAppWaMeUrl(
    typeof input.countryCode === "string" ? input.countryCode : "",
    typeof input.localNumber === "string" ? input.localNumber : "",
  );
  if (gen) return gen;
  const legacy = (input.legacyChannelUrl ?? "").trim();
  if (legacy && /^https:\/\/wa\.me\//i.test(legacy)) return legacy;
  if (legacy && /^https?:\/\//i.test(legacy)) return legacy;
  return "";
}

/**
 * If `channels.whatsapp` is enabled but URL empty, fill from country + local columns.
 * Otherwise returns a shallow copy of `channels` (or null).
 */
export function finalizeWhatsAppForPersist(
  channels: Record<string, unknown> | null,
  countryCode: string | null | undefined,
  localNumber: string | null | undefined,
): {
  channels: Record<string, unknown> | null;
  whatsapp_country_code: string | null;
  whatsapp_number: string | null;
} {
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) {
    return { channels, whatsapp_country_code: null, whatsapp_number: null };
  }
  const wa = channels.whatsapp;
  const waObj =
    typeof wa === "object" && wa !== null && !Array.isArray(wa)
      ? ({ ...(wa as Record<string, unknown>) } as Record<string, unknown>)
      : { enabled: false, url: "" };
  const enabled = waObj.enabled === true;
  if (!enabled) {
    return {
      channels: { ...channels, whatsapp: { ...waObj, enabled: false, url: "" } },
      whatsapp_country_code: null,
      whatsapp_number: null,
    };
  }
  const cc = normalizeDialCode(typeof countryCode === "string" && countryCode.trim() ? countryCode : "+91");
  const num = clampWhatsAppLocalInput(typeof localNumber === "string" ? localNumber : "");
  const url = buildWhatsAppWaMeUrl(cc, num) ?? "";
  return {
    channels: { ...channels, whatsapp: { ...waObj, enabled: true, url: url } },
    whatsapp_country_code: cc,
    whatsapp_number: num.length > 0 ? num : null,
  };
}

export function mergeWhatsAppUrlIntoChannels<T extends { whatsapp?: { enabled?: boolean; url?: string } }>(
  channels: T | null,
  countryCode: string | null | undefined,
  localNumber: string | null | undefined,
): T | null {
  if (!channels || typeof channels !== "object") return channels;
  const wa = channels.whatsapp;
  if (!wa || typeof wa !== "object") return channels;
  const url = resolveWhatsAppHttpsUrl({
    countryCode,
    localNumber,
    legacyChannelUrl: typeof wa.url === "string" ? wa.url : "",
    channelEnabled: wa.enabled === true,
  });
  if (!url) return { ...channels, whatsapp: { ...wa, url: typeof wa.url === "string" ? wa.url : "" } };
  return { ...channels, whatsapp: { ...wa, url } };
}

/** Parse wa.me/{digits} or api.whatsapp.com send links into dial + local using existing phone splitter. */
export function tryInferWhatsAppPartsFromLegacyUrl(url: string): {
  dialCode: string;
  localNumber: string;
} | null {
  const t = url.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();
    if (host === "wa.me" || host === "www.wa.me") {
      const raw = u.pathname.replace(/^\//, "").replace(/\D/g, "");
      if (raw.length < 10) return null;
      return splitPhoneNumber(`+${raw}`);
    }
    if (host.includes("whatsapp.com")) {
      const phone = u.searchParams.get("phone");
      if (phone && /^\d+$/.test(phone)) {
        return splitPhoneNumber(`+${phone}`);
      }
    }
  } catch {
    return null;
  }
  return null;
}
