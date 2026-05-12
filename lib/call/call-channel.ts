import { normalizeDialCode } from "@/lib/phone/mobile";

/** National number length (digits only, excluding country code). */
export const CALL_LOCAL_MIN_LEN = 8;
export const CALL_LOCAL_MAX_LEN = 15;

const CC_MAX_DIGITS = 4;

export function callDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Stored country calling code without `+` (e.g. `91`). */
export function normalizeCallCountryCodeStored(raw: string | null | undefined): string {
  const d = callDigitsOnly(raw ?? "").slice(0, CC_MAX_DIGITS);
  return d.length > 0 ? d : "91";
}

export function clampCallLocalInput(raw: string): string {
  return callDigitsOnly(raw).slice(0, CALL_LOCAL_MAX_LEN);
}

export type CallFormErrorMessages = {
  countryRequired: string;
  numberRequired: string;
  numberLength: string;
};

export const CALL_FORM_ERRORS_EN: CallFormErrorMessages = {
  countryRequired: "Country code is required",
  numberRequired: "Mobile number is required",
  numberLength: `Use ${CALL_LOCAL_MIN_LEN}–${CALL_LOCAL_MAX_LEN} digits (numbers only)`,
};

export const CALL_FORM_ERRORS_HI: CallFormErrorMessages = {
  countryRequired: "देश कोड आवश्यक है",
  numberRequired: "मोबाइल नंबर आवश्यक है",
  numberLength: `केवल ${CALL_LOCAL_MIN_LEN}–${CALL_LOCAL_MAX_LEN} अंक दर्ज करें`,
};

export function getCallFormErrors(
  input: {
    enabled: boolean;
    countryDialRaw: string;
    localRaw: string;
  },
  messages: CallFormErrorMessages = CALL_FORM_ERRORS_EN,
): { callCountryCode?: string; callNumber?: string } {
  if (!input.enabled) return {};
  const dial = normalizeDialCode(input.countryDialRaw?.trim() || "+91");
  const ccDigits = callDigitsOnly(dial).slice(0, CC_MAX_DIGITS);
  if (!ccDigits) {
    return { callCountryCode: messages.countryRequired };
  }
  const local = clampCallLocalInput(input.localRaw);
  if (!local) {
    return { callNumber: messages.numberRequired };
  }
  if (local.length < CALL_LOCAL_MIN_LEN || local.length > CALL_LOCAL_MAX_LEN) {
    return {
      callNumber: messages.numberLength,
    };
  }
  return {};
}

export function finalizeCallForPersist(
  enabled: boolean,
  countryDialRaw: string,
  localRaw: string | null | undefined,
): {
  call_enabled: boolean;
  call_country_code: string;
  call_number: string | null;
} {
  if (!enabled) {
    return {
      call_enabled: false,
      call_country_code: normalizeCallCountryCodeStored("91"),
      call_number: null,
    };
  }
  const dial = normalizeDialCode(countryDialRaw?.trim() || "+91");
  const cc = normalizeCallCountryCodeStored(dial);
  const local = clampCallLocalInput(String(localRaw ?? ""));
  return {
    call_enabled: true,
    call_country_code: cc,
    call_number: local.length ? local : null,
  };
}

/** `tel:+E164` for use in public CTA; returns null if disabled or invalid. */
export function buildCallTelHref(
  callEnabled: boolean | null | undefined,
  callCountryCode: string | null | undefined,
  callNumber: string | null | undefined,
): string | null {
  if (callEnabled !== true) return null;
  const cc = normalizeCallCountryCodeStored(callCountryCode ?? "91");
  const local = clampCallLocalInput(callNumber ?? "");
  if (local.length < CALL_LOCAL_MIN_LEN || local.length > CALL_LOCAL_MAX_LEN) {
    return null;
  }
  const subscriber = `${cc}${local}`;
  if (!/^\d{9,19}$/.test(subscriber)) return null;
  return `tel:+${subscriber}`;
}
