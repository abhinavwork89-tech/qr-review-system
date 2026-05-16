import {

  sanitizeEmail,

  sanitizeMobile,

  sanitizePlainText,

} from "@/lib/security/input-sanitize";



const UUID_RE =

  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;



const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



const LIMITS = {

  review_text: 8000,

  name: 200,

  email: 320,

  mobile: 32,

} as const;



const NAME_MIN_OPTIONAL = 2;



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



function compactMobile(value: string): string {

  return sanitizeMobile(value).replace(/\s+/g, "");

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



  const review_text_raw = asTrimmedString(body.review_text);

  if (!review_text_raw) {

    fields.review_text = "Required";

  } else if (review_text_raw.length > LIMITS.review_text) {

    fields.review_text = `Max ${LIMITS.review_text} characters`;

  }



  const name_raw = asTrimmedString(body.name);

  if (name_raw.length > LIMITS.name) {

    fields.name = `Max ${LIMITS.name} characters`;

  } else if (name_raw.length > 0) {

    if (!/\S/.test(name_raw)) {

      fields.name = "Enter a real name (not only spaces)";

    } else if (name_raw.length < NAME_MIN_OPTIONAL) {

      fields.name = `Name is too short (minimum ${NAME_MIN_OPTIONAL} characters)`;

    }

  }



  const email_raw = asTrimmedString(body.email);

  if (email_raw.length > LIMITS.email) {

    fields.email = "Must be a valid email";

  } else if (email_raw.length > 0) {

    const email_sanitized = sanitizeEmail(email_raw);

    if (!EMAIL_RE.test(email_sanitized) || email_sanitized.length > LIMITS.email) {

      fields.email = "Must be a valid email";

    }

  }



  const mobile_raw = asTrimmedString(body.mobile);

  if (mobile_raw.length > LIMITS.mobile) {

    fields.mobile = `Max ${LIMITS.mobile} characters`;

  } else if (mobile_raw.length > 0) {

    const mobile_compact = compactMobile(mobile_raw);

    if (!/^\+\d{8,15}$/.test(mobile_compact)) {

      fields.mobile = "Enter a valid phone number with country code";

    }

  }



  if (Object.keys(fields).length > 0) {

    return {

      ok: false,

      error: "Validation failed",

      fields,

    };

  }



  const review_text = sanitizePlainText(review_text_raw, LIMITS.review_text);

  const name = name_raw

    ? sanitizePlainText(name_raw, LIMITS.name)

    : "";

  const email = email_raw ? sanitizeEmail(email_raw) : "";

  const mobile = mobile_raw ? compactMobile(mobile_raw) : "";



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

