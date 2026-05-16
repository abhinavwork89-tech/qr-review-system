"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { formInputBase } from "@/components/admin/add-business/form-styles";
import { adminAiLabels } from "@/lib/i18n/admin-ai-labels";
import type { GlobalAISettings } from "@/lib/ai/global-settings";
import { AI_ALLOWED_MODEL } from "@/lib/ai/constants";

type Props = {
  initial: GlobalAISettings;
};

export function AiGlobalSettingsSection({ initial }: Props) {
  const router = useRouter();
  const L = adminAiLabels();
  const [aiEnabledGlobal, setAiEnabledGlobal] = useState(initial.ai_enabled_global);
  const [aiEmergencyDisable, setAiEmergencyDisable] = useState(initial.ai_emergency_disable);
  const [aiModel, setAiModel] = useState(initial.ai_model);
  const [aiMonthlyBudgetLimit, setAiMonthlyBudgetLimit] = useState(
    String(initial.ai_monthly_budget_limit),
  );
  const [aiDailyGlobalLimit, setAiDailyGlobalLimit] = useState(
    String(initial.ai_daily_global_limit),
  );
  const [aiMaxCharacterLimit, setAiMaxCharacterLimit] = useState(
    String(initial.ai_max_character_limit),
  );
  const [aiDefaultCooldownSeconds, setAiDefaultCooldownSeconds] = useState(
    String(initial.ai_default_cooldown_seconds),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setError(null);
    setSuccess(false);

    const budget = Number.parseFloat(aiMonthlyBudgetLimit.trim());
    if (!Number.isFinite(budget) || budget < 0) {
      setError("Monthly budget must be a non-negative number.");
      return;
    }
    const daily = Number.parseInt(aiDailyGlobalLimit.trim(), 10);
    if (!Number.isInteger(daily) || daily < 0) {
      setError("Daily global limit must be a non-negative integer.");
      return;
    }
    const maxChars = Number.parseInt(aiMaxCharacterLimit.trim(), 10);
    if (!Number.isInteger(maxChars) || maxChars < 50 || maxChars > 10000) {
      setError("Max characters must be between 50 and 10000.");
      return;
    }
    const cooldown = Number.parseInt(aiDefaultCooldownSeconds.trim(), 10);
    if (!Number.isInteger(cooldown) || cooldown < 0 || cooldown > 86400) {
      setError("Cooldown must be between 0 and 86400 seconds.");
      return;
    }
    const modelTrim = aiModel.trim();
    if (modelTrim !== AI_ALLOWED_MODEL) {
      setError(`Only ${AI_ALLOWED_MODEL} is supported in this phase.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/app-settings/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiEnabledGlobal: aiEnabledGlobal,
          aiEmergencyDisable: aiEmergencyDisable,
          aiModel: modelTrim,
          aiMonthlyBudgetLimit: budget,
          aiDailyGlobalLimit: daily,
          aiMaxCharacterLimit: maxChars,
          aiDefaultCooldownSeconds: cooldown,
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Save failed";
        setError(msg);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    aiEnabledGlobal,
    aiEmergencyDisable,
    aiModel,
    aiMonthlyBudgetLimit,
    aiDailyGlobalLimit,
    aiMaxCharacterLimit,
    aiDefaultCooldownSeconds,
    router,
  ]);

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
      <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{L.sectionTitle}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{L.sectionDescription}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            className="accent-indigo-600"
            checked={aiEnabledGlobal}
            onChange={(e) => setAiEnabledGlobal(e.target.checked)}
          />
          {L.globalEnabled}
        </label>
        <label className="flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            className="accent-rose-600"
            checked={aiEmergencyDisable}
            onChange={(e) => setAiEmergencyDisable(e.target.checked)}
          />
          {L.emergencyDisable}
        </label>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{L.model}</label>
          <input
            className={formInputBase}
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {L.monthlyBudgetUsd}
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={formInputBase}
            value={aiMonthlyBudgetLimit}
            onChange={(e) => setAiMonthlyBudgetLimit(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {L.dailyGlobalLimit}
          </label>
          <input
            type="number"
            min={0}
            className={formInputBase}
            value={aiDailyGlobalLimit}
            onChange={(e) => setAiDailyGlobalLimit(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {L.maxCharacters}
          </label>
          <input
            type="number"
            min={50}
            max={10000}
            className={formInputBase}
            value={aiMaxCharacterLimit}
            onChange={(e) => setAiMaxCharacterLimit(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {L.defaultCooldownSeconds}
          </label>
          <input
            type="number"
            min={0}
            max={86400}
            className={formInputBase}
            value={aiDefaultCooldownSeconds}
            onChange={(e) => setAiDefaultCooldownSeconds(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{L.saved}</p>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={adminPanel.btnPrimary}
        >
          {saving ? L.saving : L.save}
        </button>
      </div>
    </section>
  );
}
