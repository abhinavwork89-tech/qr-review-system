const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RewardClaimKind = "spin" | "scratch";

export type RewardClaimParsed = {
  business_id: string;
  kind: RewardClaimKind;
};

export function parseRewardClaimBody(input: unknown):
  | { ok: true; data: RewardClaimParsed }
  | { ok: false; error: string } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const body = input as Record<string, unknown>;
  const business_id =
    typeof body.business_id === "string" ? body.business_id.trim() : "";
  if (!business_id) return { ok: false, error: "business_id is required" };
  if (!UUID_RE.test(business_id)) return { ok: false, error: "Invalid business_id" };

  const kindRaw = typeof body.kind === "string" ? body.kind.trim().toLowerCase() : "";
  if (kindRaw !== "spin" && kindRaw !== "scratch") {
    return { ok: false, error: "kind must be spin or scratch" };
  }

  return { ok: true, data: { business_id, kind: kindRaw } };
}
