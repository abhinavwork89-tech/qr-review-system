import { getCallFormErrors, CALL_FORM_ERRORS_EN } from "@/lib/call/call-channel";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { isSafeYouTubeUrl } from "@/lib/review/youtube-url";
import {
  validateMasterQrForPersist,
  type MasterQrType,
  type MasterQrResolutionInput,
} from "@/lib/scan/master-qr";
import { getWhatsAppFormErrors } from "@/lib/whatsapp/wa-me";
import { validateInternationalPhone } from "@/lib/phone/mobile";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SocialChannelKey = "instagram" | "facebook" | "website" | "x";

export function validateEmailField(email: string): string | undefined {
  const t = email.trim();
  if (!t) return "Email is required";
  if (!EMAIL_REGEX.test(t)) return "Enter a valid email address";
  return undefined;
}

export function validateMobileField(mobile: string): string | undefined {
  const err = validateInternationalPhone(mobile.trim());
  return err ?? undefined;
}

export function validateOptionalGoogleUrl(url: string): string | undefined {
  const t = url.trim();
  if (!t) return undefined;
  if (!isSafeHttpUrl(t)) return "Enter a valid URL";
  return undefined;
}

export function validateSocialChannelUrl(
  enabled: boolean,
  url: string,
): string | undefined {
  if (!enabled) return undefined;
  const t = url.trim();
  if (!t) return "URL is required when this channel is enabled";
  if (!isSafeHttpUrl(t)) return "Enter a valid URL";
  return undefined;
}

export function validateYouTubeChannelUrl(
  enabled: boolean,
  url: string,
): string | undefined {
  if (!enabled) return undefined;
  const t = url.trim();
  if (!t) return "URL is required when this channel is enabled";
  if (!isSafeYouTubeUrl(t)) return "Enter a valid YouTube URL (youtube.com or youtu.be)";
  return undefined;
}

export function validateMasterQrSelection(
  base: MasterQrResolutionInput,
  masterQrType: MasterQrType,
): string | undefined {
  return validateMasterQrForPersist({ ...base, master_qr_type: masterQrType }) ?? undefined;
}

export function validateWhatsAppFields(input: {
  enabled: boolean;
  countryDialRaw: string;
  localRaw: string;
}): { whatsappCountryCode?: string; whatsappNumber?: string } {
  if (!input.enabled) return {};
  return getWhatsAppFormErrors({
    enabled: true,
    countryDialRaw: input.countryDialRaw,
    localRaw: input.localRaw,
  });
}

export function validateCallFields(input: {
  enabled: boolean;
  countryDialRaw: string;
  localRaw: string;
}): { callCountryCode?: string; callNumber?: string } {
  if (!input.enabled) return {};
  return getCallFormErrors(
    {
      enabled: true,
      countryDialRaw: input.countryDialRaw,
      localRaw: input.localRaw,
    },
    CALL_FORM_ERRORS_EN,
  );
}

export function validateAiDailyLimit(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 50000) {
    return "Enter a daily limit from 1 to 50000";
  }
  return undefined;
}

export function validateAiSuggestionsCount(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    return "Use 1–20 or leave blank for plan default";
  }
  return undefined;
}

export type DetailChannelErrors = Partial<
  Record<SocialChannelKey | "youtube", string>
>;

export function validateDetailChannelErrors(channels: {
  instagram: { enabled: boolean; url: string };
  facebook: { enabled: boolean; url: string };
  youtube: { enabled: boolean; url: string };
  website: { enabled: boolean; url: string };
  x: { enabled: boolean; url: string };
}): DetailChannelErrors {
  return {
    instagram: validateSocialChannelUrl(
      channels.instagram.enabled,
      channels.instagram.url,
    ),
    facebook: validateSocialChannelUrl(channels.facebook.enabled, channels.facebook.url),
    youtube: validateYouTubeChannelUrl(channels.youtube.enabled, channels.youtube.url),
    website: validateSocialChannelUrl(channels.website.enabled, channels.website.url),
    x: validateSocialChannelUrl(channels.x.enabled, channels.x.url),
  };
}

/** Strip undefined entries for stable object comparison. */
export function compactErrors<T extends Record<string, string | undefined>>(
  e: T,
): Partial<Record<keyof T, string>> {
  const out: Partial<Record<keyof T, string>> = {};
  for (const k of Object.keys(e) as (keyof T)[]) {
    if (e[k]) out[k] = e[k];
  }
  return out;
}
