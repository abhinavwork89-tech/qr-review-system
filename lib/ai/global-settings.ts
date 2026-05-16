import { createServiceRoleClient } from "@/lib/supabase/server";
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";

export type GlobalAISettings = {
  ai_enabled_global: boolean;
  ai_model: string;
  ai_monthly_budget_limit: number;
  ai_daily_global_limit: number;
  ai_emergency_disable: boolean;
  ai_max_character_limit: number;
  ai_default_cooldown_seconds: number;
};

const DEFAULTS: GlobalAISettings = {
  ai_enabled_global: false,
  ai_model: AI_ALLOWED_MODEL,
  ai_monthly_budget_limit: 500,
  ai_daily_global_limit: 10000,
  ai_emergency_disable: false,
  ai_max_character_limit: 220,
  ai_default_cooldown_seconds: 45,
};

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number.parseFloat(v))) {
    return Number.parseFloat(v);
  }
  return fallback;
}

function int(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" && Number.isInteger(v) ? v : Math.floor(num(v, fallback));
  return Math.min(max, Math.max(min, n));
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function rowToSettings(r: Record<string, unknown> | null): GlobalAISettings {
  if (!r) return { ...DEFAULTS };
  const modelRaw = typeof r.ai_model === "string" ? r.ai_model.trim() : "";
  const model = modelRaw === AI_ALLOWED_MODEL ? modelRaw : DEFAULTS.ai_model;
  return {
    ai_enabled_global: bool(r.ai_enabled_global, DEFAULTS.ai_enabled_global),
    ai_model: model,
    ai_monthly_budget_limit: Math.max(0, num(r.ai_monthly_budget_limit, DEFAULTS.ai_monthly_budget_limit)),
    ai_daily_global_limit: int(
      r.ai_daily_global_limit,
      DEFAULTS.ai_daily_global_limit,
      0,
      50_000_000,
    ),
    ai_emergency_disable: bool(r.ai_emergency_disable, DEFAULTS.ai_emergency_disable),
    ai_max_character_limit: int(
      r.ai_max_character_limit,
      DEFAULTS.ai_max_character_limit,
      50,
      10_000,
    ),
    ai_default_cooldown_seconds: int(
      r.ai_default_cooldown_seconds,
      DEFAULTS.ai_default_cooldown_seconds,
      0,
      86400,
    ),
  };
}

/**
 * Server-only: global AI configuration from `app_settings` singleton.
 */
export async function getGlobalAISettings(): Promise<GlobalAISettings> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select(
        "ai_enabled_global, ai_model, ai_monthly_budget_limit, ai_daily_global_limit, ai_emergency_disable, ai_max_character_limit, ai_default_cooldown_seconds",
      )
      .limit(1)
      .maybeSingle();
    if (error) {
      if (error.code !== "42P01" && error.code !== "PGRST205") {
        console.error("getGlobalAISettings", error.message);
      }
      return { ...DEFAULTS };
    }
    return rowToSettings((data ?? null) as Record<string, unknown> | null);
  } catch {
    return { ...DEFAULTS };
  }
}
