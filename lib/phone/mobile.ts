export const COUNTRY_DIAL_CODES = [
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "AE", name: "UAE", dialCode: "+971" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "JP", name: "Japan", dialCode: "+81" },
] as const;

export const DEFAULT_DIAL_CODE = "+91";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function sanitizePhoneLocalInput(value: string): string {
  return digitsOnly(value);
}

export function normalizeDialCode(value: string): string {
  const digits = digitsOnly(value);
  return digits ? `+${digits}` : DEFAULT_DIAL_CODE;
}

export function joinDialAndLocal(dialCode: string, local: string): string {
  const d = normalizeDialCode(dialCode);
  const n = sanitizePhoneLocalInput(local);
  return n ? `${d}${n}` : d;
}

export function splitPhoneNumber(value: string): {
  dialCode: string;
  localNumber: string;
} {
  const compact = value.trim().replace(/\s+/g, "");
  if (!compact) return { dialCode: DEFAULT_DIAL_CODE, localNumber: "" };

  if (compact.startsWith("+")) {
    const sorted = [...COUNTRY_DIAL_CODES].sort(
      (a, b) => b.dialCode.length - a.dialCode.length,
    );
    for (const item of sorted) {
      if (compact.startsWith(item.dialCode)) {
        return {
          dialCode: item.dialCode,
          localNumber: sanitizePhoneLocalInput(
            compact.slice(item.dialCode.length),
          ),
        };
      }
    }
    const digits = digitsOnly(compact.slice(1));
    const ccLen = digits.length >= 12 ? 3 : digits.length >= 11 ? 2 : 1;
    return {
      dialCode: `+${digits.slice(0, ccLen) || "91"}`,
      localNumber: digits.slice(ccLen),
    };
  }

  return {
    dialCode: DEFAULT_DIAL_CODE,
    localNumber: sanitizePhoneLocalInput(compact),
  };
}

export function validateInternationalPhone(value: string): string | null {
  const compact = value.trim().replace(/\s+/g, "");
  if (!compact) return "This field is required";
  if (!compact.startsWith("+")) return "Country code is required";
  if (!/^\+\d+$/.test(compact)) return "Use digits only";
  const digits = compact.slice(1);
  if (digits.length < 8 || digits.length > 15) return "Enter a valid mobile number";
  return null;
}
