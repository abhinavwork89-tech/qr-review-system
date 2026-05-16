import type { SupabaseClient } from "@supabase/supabase-js";

/** UTC midnight for the given Date (year/month/day in UTC). */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Count AI generation rows since `since` (inclusive), optionally scoped to one business.
 */
export async function countAiGenerationsSince(
  supabase: SupabaseClient,
  sinceIso: string,
  businessId?: string | null,
): Promise<number> {
  let q = supabase
    .from("ai_review_generations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (businessId) {
    q = q.eq("business_id", businessId);
  }
  const { count, error } = await q;
  if (error) {
    console.error("countAiGenerationsSince", error.message);
    return 0;
  }
  return typeof count === "number" ? count : 0;
}

export async function getLastAiGenerationCreatedAt(
  supabase: SupabaseClient,
  businessId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_review_generations")
    .select("created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const raw = (data as { created_at?: unknown }).created_at;
  return typeof raw === "string" ? raw : null;
}

/** Last successful generation time (for cooldown; excludes blocked/failed). */
export async function getLastCompletedAiGenerationCreatedAt(
  supabase: SupabaseClient,
  businessId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_review_generations")
    .select("created_at")
    .eq("business_id", businessId)
    .eq("generation_status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const raw = (data as { created_at?: unknown }).created_at;
  return typeof raw === "string" ? raw : null;
}

/**
 * Count completed generations (counts toward daily limits and load).
 */
export async function countCompletedAiGenerationsSince(
  supabase: SupabaseClient,
  sinceIso: string,
  businessId?: string | null,
): Promise<number> {
  let q = supabase
    .from("ai_review_generations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso)
    .eq("generation_status", "completed");
  if (businessId) {
    q = q.eq("business_id", businessId);
  }
  const { count, error } = await q;
  if (error) {
    console.error("countCompletedAiGenerationsSince", error.message);
    return 0;
  }
  return typeof count === "number" ? count : 0;
}

export type CooldownCheck = { blocked: boolean; secondsRemaining?: number };

/**
 * Returns whether the business must wait before another AI call (server-side only).
 */
export function evaluateCooldown(
  lastCreatedAtIso: string | null,
  cooldownSeconds: number,
  now: Date = new Date(),
): CooldownCheck {
  if (cooldownSeconds <= 0 || !lastCreatedAtIso) {
    return { blocked: false };
  }
  const last = Date.parse(lastCreatedAtIso);
  if (!Number.isFinite(last)) return { blocked: false };
  const elapsedSec = (now.getTime() - last) / 1000;
  if (elapsedSec >= cooldownSeconds) return { blocked: false };
  return {
    blocked: true,
    secondsRemaining: Math.ceil(cooldownSeconds - elapsedSec),
  };
}

export type DailyLimitCheck = {
  allowed: boolean;
  used: number;
  limit: number;
};

export function evaluateDailyLimit(used: number, limit: number): DailyLimitCheck {
  const lim = Math.max(0, Math.floor(limit));
  const u = Math.max(0, Math.floor(used));
  if (lim <= 0) return { allowed: true, used: u, limit: lim };
  return { allowed: u < lim, used: u, limit: lim };
}
