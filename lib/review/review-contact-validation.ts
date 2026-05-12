const NAME_MIN = 2;
const NAME_MAX = 200;
const EMAIL_LOCAL_MAX = 320;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns i18n path under `messages/review/*.json` or null if valid. */
export function nameValidationMessageKey(name: string): string | null {
  const trimmed = name.replace(/^\s+|\s+$/g, "");
  if (!trimmed) return "validation.contact.nameRequired";
  if (!/\S/.test(trimmed)) return "validation.contact.nameOnlySpaces";
  if (trimmed.length < NAME_MIN) return "validation.contact.nameTooShort";
  if (trimmed.length > NAME_MAX) return "validation.contact.nameTooLong";
  return null;
}

export function emailValidationMessageKey(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "validation.contact.emailRequired";
  if (trimmed.length > EMAIL_LOCAL_MAX) return "validation.contact.emailTooLong";
  if (!EMAIL_RE.test(trimmed)) return "validation.contact.emailInvalid";
  return null;
}

export function normalizeReviewEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function clampReviewMobileNationalInput(raw: string, maxLen = 15): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

/** When the field is optional: empty input is valid. */
export function optionalNameValidationMessageKey(name: string): string | null {
  const trimmed = name.replace(/^\s+|\s+$/g, "");
  if (!trimmed) return null;
  if (!/\S/.test(trimmed)) return "validation.contact.nameOnlySpaces";
  if (trimmed.length < NAME_MIN) return "validation.contact.nameTooShort";
  if (trimmed.length > NAME_MAX) return "validation.contact.nameTooLong";
  return null;
}

export function optionalEmailValidationMessageKey(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.length > EMAIL_LOCAL_MAX) return "validation.contact.emailTooLong";
  if (!EMAIL_RE.test(lower)) return "validation.contact.emailInvalid";
  return null;
}
