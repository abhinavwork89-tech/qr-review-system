import { AiGlobalSettingsSection } from "@/components/admin/settings/ai-global-settings-section";
import { BrandingSettingsSection } from "@/components/admin/settings/branding-settings-section";
import { BusinessTypesManager } from "@/components/admin/settings/business-types-manager";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { getGlobalAISettings } from "@/lib/ai/global-settings";
import { listBusinessTypesWithUsage } from "@/lib/data/business-types-admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, aiSettings, { types, error: businessTypesError }] = await Promise.all([
    getAppSettingsPublic(),
    getGlobalAISettings(),
    listBusinessTypesWithUsage(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Branding, footer content, and business type catalog.
        </p>
      </div>

      <BrandingSettingsSection initial={settings} />
      <AiGlobalSettingsSection initial={aiSettings} />
      <BusinessTypesManager initialTypes={types} loadError={businessTypesError} />
    </div>
  );
}
