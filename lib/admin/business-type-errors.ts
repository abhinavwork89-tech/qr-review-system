/** User-facing message for unique slug violations on `business_types`. */
export const BUSINESS_TYPE_DUPLICATE_MESSAGE = "Business type already exists";

export function isPostgresUniqueViolation(err: {
  code?: string;
  message?: string;
}): boolean {
  if (err.code === "23505") return true;
  const m = err.message ?? "";
  return /duplicate key|unique constraint/i.test(m);
}
