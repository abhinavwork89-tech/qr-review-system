import { stripDangerousSequences } from "@/lib/security/input-sanitize";

export const BUSINESS_IDENTITY_TYPES = [
  "aadhaar",
  "pan",
  "passport",
  "voter_id",
] as const;

export type BusinessIdentityTypeSlug = (typeof BUSINESS_IDENTITY_TYPES)[number];

export const IDENTITY_TYPE_LABELS: Record<BusinessIdentityTypeSlug, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  passport: "Passport",
  voter_id: "Voter ID",
};

export function isAllowedIdentityTypeSlug(s: string): s is BusinessIdentityTypeSlug {
  return (BUSINESS_IDENTITY_TYPES as readonly string[]).includes(s);
}

/** Trim; lowercase slug for storage comparison. */
export function parseIdentityTypeInput(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

/**
 * Normalize number for validation/storage (trim spaces; uppercase where applicable).
 */
export function normalizeIdentityNumberForStorage(
  typeSlug: BusinessIdentityTypeSlug,
  raw: string,
): string {
  return formatIdentityNumberInput(typeSlug, raw);
}

/** Max length after formatting (matches input maxLength). */
export function getIdentityNumberMaxLength(typeSlug: string): number {
  switch (typeSlug) {
    case "aadhaar":
      return 12;
    case "pan":
      return 10;
    case "passport":
      return 20;
    case "voter_id":
      return 15;
    default:
      return 0;
  }
}

/**
 * Live input: trim spaces, strip invalid chars, uppercase where required,
 * enforce per-type max length. Use on every keystroke for controlled inputs.
 */
export function formatIdentityNumberInput(typeSlug: string, raw: string): string {
  const t = stripDangerousSequences(raw).trim();
  if (!typeSlug || !isAllowedIdentityTypeSlug(typeSlug)) return "";
  switch (typeSlug) {
    case "aadhaar":
      return t.replace(/\D/g, "").slice(0, 12);
    case "pan": {
      const u = t.replace(/\s/g, "").toUpperCase();
      let out = "";
      for (let i = 0; i < u.length && out.length < 10; i++) {
        const c = u[i]!;
        const pos = out.length;
        if (pos < 5) {
          if (/[A-Z]/.test(c)) out += c;
        } else if (pos < 9) {
          if (/[0-9]/.test(c)) out += c;
        } else if (pos === 9) {
          if (/[A-Z]/.test(c)) out += c;
        }
      }
      return out;
    }
    case "passport":
      return t.replace(/\s/g, "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
    case "voter_id":
      return t.replace(/\s/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    default:
      return "";
  }
}

/**
 * Inline validation for forms and APIs. Keys: `identity_type`, `identity_number`.
 * `typeSlug`: null/empty = no type selected; otherwise must be an allowed slug.
 */
export function getIdentityFieldErrors(
  typeSlug: string | null,
  numberRaw: string,
): Record<string, string> {
  const fields: Record<string, string> = {};
  const t = typeSlug?.trim().toLowerCase() || null;
  const n = typeof numberRaw === "string" ? numberRaw : "";

  if (!t) {
    fields.identity_type = "Identity type is required.";
    if (n.trim()) {
      fields.identity_number = "Clear the identity number or select an identity type.";
    }
    return fields;
  }

  if (!isAllowedIdentityTypeSlug(t)) {
    fields.identity_type = "Select a valid identity type.";
    return fields;
  }

  if (!n.trim()) {
    fields.identity_number = "Identity number is required when an identity type is selected.";
    return fields;
  }

  const normalized = formatIdentityNumberInput(t, n);

  switch (t) {
    case "aadhaar":
      if (!/^[0-9]{12}$/.test(normalized)) {
        fields.identity_number = "Aadhaar must be exactly 12 digits (numbers only).";
      }
      break;
    case "pan":
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalized)) {
        fields.identity_number =
          "PAN must match format ABCDE1234F (5 letters, 4 digits, 1 letter).";
      }
      break;
    case "passport":
      if (normalized.length < 6 || normalized.length > 20) {
        fields.identity_number =
          "Passport must be 6–20 characters (letters, numbers, hyphen only).";
      } else if (!/^[A-Z0-9-]+$/.test(normalized)) {
        fields.identity_number = "Passport may only contain letters, numbers, and hyphens.";
      }
      break;
    case "voter_id":
      if (normalized.length < 3 || normalized.length > 15) {
        fields.identity_number = "Voter ID must be 3–15 alphanumeric characters.";
      } else if (!/^[A-Z0-9]+$/.test(normalized)) {
        fields.identity_number = "Voter ID must be alphanumeric.";
      }
      break;
    default:
      break;
  }

  return fields;
}

/** Keys: `identity_proof_urls`, `client_photo_url` — for APIs when identity is complete. */
export function getIdentityDocumentErrors(input: {
  identityProofUrlCount: number;
  clientPhotoUrlPresent: boolean;
}): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.identityProofUrlCount < 1) {
    fields.identity_proof_urls = "Upload at least one identity proof photo.";
  }
  if (!input.clientPhotoUrlPresent) {
    fields.client_photo_url = "Client profile photo is required.";
  }
  return fields;
}

export function finalizeIdentityForDb(
  typeRaw: string,
  numberRaw: string,
): { identity_type: string | null; identity_number: string | null } {
  const slug = parseIdentityTypeInput(typeRaw);
  if (!slug || !isAllowedIdentityTypeSlug(slug)) {
    return { identity_type: null, identity_number: null };
  }
  const num = normalizeIdentityNumberForStorage(slug, numberRaw);
  return { identity_type: slug, identity_number: num.length > 0 ? num : null };
}

export function identityTypeLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  const s = slug.trim().toLowerCase();
  if (isAllowedIdentityTypeSlug(s)) return IDENTITY_TYPE_LABELS[s];
  return slug;
}

/** Merge patch + DB row for identity validation on PATCH. */
export function mergeIdentityFromPatchAndRow(
  patch: Record<string, unknown>,
  currentRow: Record<string, unknown>,
): { typeSlug: string | null; numberRaw: string } {
  const curT = parseIdentityTypeInput(currentRow.identity_type) || null;
  const curN =
    typeof currentRow.identity_number === "string" ? currentRow.identity_number : "";

  let typeSlug = curT;
  let numberRaw = curN;

  if ("identity_type" in patch) {
    const v = patch.identity_type;
    if (v === null || v === undefined || v === "") typeSlug = null;
    else if (typeof v === "string") typeSlug = parseIdentityTypeInput(v) || null;
    else typeSlug = null;
  }
  if ("identity_number" in patch) {
    const v = patch.identity_number;
    if (v === null || v === undefined) numberRaw = "";
    else if (typeof v === "string") numberRaw = v;
    else numberRaw = String(v);
  }

  return { typeSlug, numberRaw };
}
