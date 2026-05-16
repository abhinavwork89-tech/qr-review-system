import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { parseRewardClaimBody } from "@/lib/validation/reward-claim-post";
import { enforcePublicRateLimits } from "@/lib/security/enforce-public-rate-limit";
import {
  consumePublicRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/security/public-rate-limit";
import { createRouteLogger } from "@/lib/logging/app-logger";
import { rejectOversizedBody } from "@/lib/security/request-body-limit";

export const runtime = "nodejs";

function extractRewardsFromChannels(channels: unknown): {
  spinEnabled: boolean;
  scratchEnabled: boolean;
  rewards: string[];
} {
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) {
    return { spinEnabled: false, scratchEnabled: false, rewards: [] };
  }
  const o = channels as Record<string, unknown>;
  const spinEnabled = o.spin_enabled === true;
  const scratchEnabled = o.scratch_enabled === true;
  const raw = o.reward_config;
  const rewards = Array.isArray(raw)
    ? raw
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];
  return { spinEnabled, scratchEnabled, rewards };
}

export async function POST(request: Request) {
  const log = createRouteLogger("reward", "/api/reward/claim", request.headers);
  try {
    const tooLarge = rejectOversizedBody(request, 2048);
    if (tooLarge) return tooLarge;

    const limited = enforcePublicRateLimits(request.headers, [
      { prefix: "reward:ip", max: 40, windowMs: 10 * 60_000 },
    ]);
    if (limited) return limited;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseRewardClaimBody(json);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { business_id, kind } = parsed.data;

    const ip = getClientIp(request.headers);
    const burst = consumePublicRateLimit(`reward:burst:${ip}:${business_id}:${kind}`, 2, 60_000);
    if (!burst.allowed) {
      return rateLimitExceededResponse(burst.retryAfterSec);
    }

    const supabase = createServiceRoleClient();
    const { data: row, error } = await supabase
      .from("businesses")
      .select("id,status,channels")
      .eq("id", business_id)
      .maybeSingle();

    if (error) {
      log.error("business_lookup_failed", {});
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const status = normalizeBusinessStatus(row as Record<string, unknown>);
    if (!isBusinessActiveStatus(status)) {
      return NextResponse.json({ error: "Business no longer available" }, { status: 410 });
    }

    const { spinEnabled, scratchEnabled, rewards } = extractRewardsFromChannels(
      (row as { channels?: unknown }).channels,
    );

    if (rewards.length === 0) {
      return NextResponse.json({ error: "No rewards configured" }, { status: 400 });
    }

    if (kind === "spin" && !spinEnabled) {
      return NextResponse.json({ error: "Spin reward is not enabled" }, { status: 400 });
    }
    if (kind === "scratch" && !scratchEnabled) {
      return NextResponse.json({ error: "Scratch reward is not enabled" }, { status: 400 });
    }

    const index = randomInt(0, rewards.length);
    const prize = rewards[index] ?? rewards[0]!;

    return NextResponse.json({
      prize,
      index,
      rewards,
    });
  } catch (e) {
    log.error("unhandled", {}, e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
