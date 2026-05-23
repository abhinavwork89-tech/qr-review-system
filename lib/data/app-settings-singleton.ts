import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";

export type AppSettingsPatchResult =
  | { ok: true; id: string }
  | { ok: false; error: string; code?: string };

/** Schema singleton primary key (`app_settings.id` smallint CHECK = 1). */
export const APP_SETTINGS_SINGLETON_ID = 1;

/** Defaults for first insert when `app_settings` is empty (UUID or legacy id). */
export function defaultAppSettingsInsertRow(): Record<string, unknown> {
  const year = new Date().getUTCFullYear();
  const now = new Date().toISOString();
  return {
    branding_logo_url: null,
    powered_by_url: "https://onecore.example",
    copyright_text: "",
    copyright_year: year,
    ai_enabled_global: false,
    ai_model: AI_ALLOWED_MODEL,
    ai_monthly_budget_limit: 500,
    ai_daily_global_limit: 10000,
    ai_emergency_disable: false,
    ai_max_character_limit: 220,
    ai_default_cooldown_seconds: 45,
    updated_at: now,
  };
}

function readRowId(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("id" in data)) return null;
  const id = (data as { id: unknown }).id;
  if (id === null || id === undefined) return null;
  return String(id);
}

/**
 * Returns the singleton `app_settings` row id (UUID or legacy), or null if the table is empty.
 */
export async function getAppSettingsSingletonId(
  supabase?: SupabaseClient,
): Promise<string | null> {
  const client = supabase ?? createServiceRoleClient();
  const { data, error } = await client
    .from("app_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return readRowId(data);
}

async function updateAppSettingsById(
  client: SupabaseClient,
  id: string,
  payload: Record<string, unknown>,
): Promise<AppSettingsPatchResult> {
  const { error } = await client.from("app_settings").update(payload).eq("id", id);
  if (error) {
    return { ok: false, error: error.message, code: error.code };
  }
  return { ok: true, id };
}

/**
 * Insert the singleton row when the table is empty; returns the new row id.
 */
async function insertAppSettingsSingleton(
  client: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<AppSettingsPatchResult> {
  const insertRow = {
    id: APP_SETTINGS_SINGLETON_ID,
    ...defaultAppSettingsInsertRow(),
    ...payload,
  };

  const { data, error } = await client
    .from("app_settings")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existingId = await getAppSettingsSingletonId(client);
      if (existingId) {
        return updateAppSettingsById(client, existingId, payload);
      }
    }
    return { ok: false, error: error.message, code: error.code };
  }

  const newId = readRowId(data) ?? (await getAppSettingsSingletonId(client));
  if (!newId) {
    return {
      ok: false,
      error: "Insert succeeded but no row id returned",
      code: "PGRST116",
    };
  }
  return { ok: true, id: newId };
}

/**
 * Patch the singleton settings row by id; insert a default row when the table is empty.
 */
export async function patchAppSettingsSingleton(
  patch: Record<string, unknown>,
  supabase?: SupabaseClient,
): Promise<AppSettingsPatchResult> {
  const client = supabase ?? createServiceRoleClient();
  const existingId = await getAppSettingsSingletonId(client);
  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    return updateAppSettingsById(client, existingId, payload);
  }

  return insertAppSettingsSingleton(client, payload);
}
