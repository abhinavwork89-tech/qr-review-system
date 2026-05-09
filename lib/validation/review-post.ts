const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  review_text: 8000,
  name: 200,
  email: 320,
  mobile: 32,
} as const;

export type ReviewPostPayload = {
  business_id: string;
  rating: number;
  review_text: string;
  name: string;
  email: string;
  mobile: string;
};

export type ReviewPostValidationError = {
  ok: false;
  error: string;
  fields: Record<string, string>;
};

export type ReviewPostValidationOk = {
  ok: true;
  data: ReviewPostPayload;
};

export type ReviewPostValidationResult =
  | ReviewPostValidationOk
  | ReviewPostValidationError;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && Number.isInteger(n)) return n;
  }
  return null;
}

export function parseReviewPostBody(
  input: unknown,
): ReviewPostValidationResult {
  const fields: Record<string, string> = {};

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Body must be a JSON object", fields: {} };
  }

  const body = input as Record<string, unknown>;

  const business_id = asTrimmedString(body.business_id);
  if (!business_id) {
    fields.business_id = "Required";
  } else if (!UUID_RE.test(business_id)) {
    fields.business_id = "Must be a valid UUID";
  }

  const rating = normalizeRating(body.rating);
  if (rating === null || rating < 1 || rating > 5) {
    fields.rating = "Must be an integer from 1 to 5";
  }

  const review_text = asTrimmedString(body.review_text);
  if (!review_text) {
    fields.review_text = "Required";
  } else if (review_text.length > LIMITS.review_text) {
    fields.review_text = `Max ${LIMITS.review_text} characters`;
  }

  const name = asTrimmedString(body.name);
  if (!name) {
    fields.name = "Required";
  } else if (name.length > LIMITS.name) {
    fields.name = `Max ${LIMITS.name} characters`;
  }

  const email = asTrimmedString(body.email).toLowerCase();
  if (!email) {
    fields.email = "Required";
  } else if (!EMAIL_RE.test(email) || email.length > LIMITS.email) {
    fields.email = "Must be a valid email";
  }

  const mobile = asTrimmedString(body.mobile);
  if (!mobile) {
    fields.mobile = "Required";
  } else if (mobile.length > LIMITS.mobile) {
    fields.mobile = `Max ${LIMITS.mobile} characters`;
  } else if (!/^[\d\s+().-]{8,}$/.test(mobile)) {
    fields.mobile = "Enter a valid phone number";
  }

  if (Object.keys(fields).length > 0) {
    return {
      ok: false,
      error: "Validation failed",
      fields,
    };
  }

  return {
    ok: true,
    data: {
      business_id,
      rating: rating!,
      review_text,
      name,
      email,
      mobile,
    },
  };
}
