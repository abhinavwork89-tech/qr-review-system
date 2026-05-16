import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin-session";
import { getGlobalAISettings } from "@/lib/ai/global-settings";
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";
import { patchAppSettingsSingleton } from "@/lib/data/app-settings-singleton";

export async function PATCH(request: Request) {
  const deny = await requireAdminSession();
  if (deny) return deny;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const o = json as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const aiEnabledGlobal = o.aiEnabledGlobal ?? o.ai_enabled_global;
  if (typeof aiEnabledGlobal !== "boolean") {
    fields.aiEnabledGlobal = "Must be a boolean";
  }

  const aiEmergencyDisable = o.aiEmergencyDisable ?? o.ai_emergency_disable;
  if (typeof aiEmergencyDisable !== "boolean") {
    fields.aiEmergencyDisable = "Must be a boolean";
  }

  const modelRaw =
    typeof o.aiModel === "string"
      ? o.aiModel.trim()
      : typeof o.ai_model === "string"
        ? o.ai_model.trim()
        : "";
  if (!modelRaw || modelRaw !== AI_ALLOWED_MODEL) {
    fields.aiModel = `Must be ${AI_ALLOWED_MODEL}`;
  }

  const budgetRaw = o.aiMonthlyBudgetLimit ?? o.ai_monthly_budget_limit;
  let aiMonthlyBudgetLimit: number;
  if (typeof budgetRaw === "number" && Number.isFinite(budgetRaw)) {
    aiMonthlyBudgetLimit = budgetRaw;
  } else if (typeof budgetRaw === "string" && budgetRaw.trim()) {
    aiMonthlyBudgetLimit = Number.parseFloat(budgetRaw.trim());
  } else {
    fields.aiMonthlyBudgetLimit = "Must be a number";
    aiMonthlyBudgetLimit = NaN;
  }
  if (!fields.aiMonthlyBudgetLimit && (!Number.isFinite(aiMonthlyBudgetLimit) || aiMonthlyBudgetLimit < 0)) {
    fields.aiMonthlyBudgetLimit = "Must be a non-negative number";
  }

  const dailyRaw = o.aiDailyGlobalLimit ?? o.ai_daily_global_limit;
  let aiDailyGlobalLimit: number;
  if (typeof dailyRaw === "number" && Number.isInteger(dailyRaw)) {
    aiDailyGlobalLimit = dailyRaw;
  } else if (typeof dailyRaw === "string" && /^\d+$/.test(dailyRaw.trim())) {
    aiDailyGlobalLimit = Number.parseInt(dailyRaw.trim(), 10);
  } else {
    fields.aiDailyGlobalLimit = "Must be a non-negative integer";
    aiDailyGlobalLimit = -1;
  }
  if (!fields.aiDailyGlobalLimit && (aiDailyGlobalLimit < 0 || aiDailyGlobalLimit > 50_000_000)) {
    fields.aiDailyGlobalLimit = "Out of range";
  }

  const maxCharsRaw = o.aiMaxCharacterLimit ?? o.ai_max_character_limit;
  let aiMaxCharacterLimit: number;
  if (typeof maxCharsRaw === "number" && Number.isInteger(maxCharsRaw)) {
    aiMaxCharacterLimit = maxCharsRaw;
  } else if (typeof maxCharsRaw === "string" && /^\d+$/.test(maxCharsRaw.trim())) {
    aiMaxCharacterLimit = Number.parseInt(maxCharsRaw.trim(), 10);
  } else {
    fields.aiMaxCharacterLimit = "Must be an integer";
    aiMaxCharacterLimit = NaN;
  }
  if (
    !fields.aiMaxCharacterLimit &&
    (!Number.isInteger(aiMaxCharacterLimit) || aiMaxCharacterLimit < 50 || aiMaxCharacterLimit > 10000)
  ) {
    fields.aiMaxCharacterLimit = "Must be between 50 and 10000";
  }

  const coolRaw = o.aiDefaultCooldownSeconds ?? o.ai_default_cooldown_seconds;
  let aiDefaultCooldownSeconds: number;
  if (typeof coolRaw === "number" && Number.isInteger(coolRaw)) {
    aiDefaultCooldownSeconds = coolRaw;
  } else if (typeof coolRaw === "string" && /^\d+$/.test(coolRaw.trim())) {
    aiDefaultCooldownSeconds = Number.parseInt(coolRaw.trim(), 10);
  } else {
    fields.aiDefaultCooldownSeconds = "Must be an integer";
    aiDefaultCooldownSeconds = -1;
  }
  if (
    !fields.aiDefaultCooldownSeconds &&
    (aiDefaultCooldownSeconds < 0 || aiDefaultCooldownSeconds > 86400)
  ) {
    fields.aiDefaultCooldownSeconds = "Must be between 0 and 86400";
  }

  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: "Validation failed", fields }, { status: 400 });
  }

  const result = await patchAppSettingsSingleton({
    ai_enabled_global: aiEnabledGlobal as boolean,
    ai_emergency_disable: aiEmergencyDisable as boolean,
    ai_model: modelRaw,
    ai_monthly_budget_limit: aiMonthlyBudgetLimit,
    ai_daily_global_limit: aiDailyGlobalLimit,
    ai_max_character_limit: aiMaxCharacterLimit,
    ai_default_cooldown_seconds: aiDefaultCooldownSeconds,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.code === "42P01" ? 503 : 500 },
    );
  }

  const ai = await getGlobalAISettings();
  return NextResponse.json({ ok: true, ai }, { status: 200 });
}
