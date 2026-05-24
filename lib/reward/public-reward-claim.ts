import type { RewardClaimKind } from "@/lib/validation/reward-claim-post";

export type RewardClaimResponse = {
  prize: string;
  index: number;
  rewards: string[];
};

const inflightClaims = new Map<string, Promise<RewardClaimResponse>>();

function claimKey(businessId: string, kind: RewardClaimKind): string {
  return `${businessId.trim()}:${kind}`;
}

/**
 * POST /api/reward/claim — dedupes concurrent identical claims (double-click / Strict Mode).
 */
export async function postPublicRewardClaim(
  businessId: string,
  kind: RewardClaimKind,
  signal?: AbortSignal,
): Promise<RewardClaimResponse> {
  const key = claimKey(businessId, kind);
  const existing = inflightClaims.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<RewardClaimResponse> => {
    const res = await fetch("/api/reward/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId, kind }),
      signal,
    });
    const raw = await res.text();
    let body: unknown = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
    if (!res.ok) {
      const err =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "Request failed";
      throw new Error(err);
    }
    const o = body as Record<string, unknown>;
    const prize = typeof o.prize === "string" ? o.prize : "";
    const index = typeof o.index === "number" && Number.isInteger(o.index) ? o.index : 0;
    const rewards = Array.isArray(o.rewards)
      ? o.rewards.map((x) => (typeof x === "string" ? x : "")).filter((s) => s.length > 0)
      : [];
    return { prize, index, rewards };
  })();

  inflightClaims.set(key, promise);
  try {
    return await promise;
  } finally {
    if (inflightClaims.get(key) === promise) {
      inflightClaims.delete(key);
    }
  }
}
