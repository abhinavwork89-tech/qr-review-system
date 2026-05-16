import adminEn from "@/messages/admin/en.json";

type Nested = typeof adminEn;

/** English-only admin copy; structured for future locale files. */
export function adminAiLabels(): Nested["ai"] {
  return adminEn.ai;
}
