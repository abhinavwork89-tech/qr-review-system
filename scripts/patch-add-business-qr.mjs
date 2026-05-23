import fs from "fs";

const p = "components/admin/add-business/add-business-form.tsx";
let s = fs.readFileSync(p, "utf8");

if (!s.includes("MasterQrTargetSelector")) {
  s = s.replace(
    `import { RewardGameModeSelector } from "@/components/admin/business/reward-game-mode-display";`,
    `import { RewardGameModeSelector } from "@/components/admin/business/reward-game-mode-display";
import { MasterQrTargetSelector } from "@/components/admin/business/master-qr-target-selector";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";
import {
  type MasterQrTarget,
  validateMasterQrTargetForPersist,
} from "@/lib/scan/master-qr-target";`,
  );
}

s = s.replace(
  `  validateMasterQrSelection,`,
  `  validateMasterQrTargetSelection,`,
);

s = s.replace(
  /  const masterErr = validateMasterQrSelection\([\s\S]*?if \(masterErr\) e\.masterQrType = masterErr;/,
  `  const masterErr = validateMasterQrTargetSelection(
    masterTargetContextFromForm(values, resourceFileCount > 0 ? ["https://placeholder.local"] : []),
    values.masterQrTarget,
    resolvePublicAppOrigin(),
  );
  if (masterErr) e.masterQrTarget = masterErr;`,
);

s = s.replace(
  `const MASTER_QR_GROUP_ADD = "masterQrAddBusiness";

const AI_ADMIN`,
  `const AI_ADMIN`,
);

s = s.replace(
  /function masterBaseFromFormValues\(v: FormValues\) \{[\s\S]*?\n\}\n\ntype FormValues/,
  `function masterBaseFromFormValues(v: FormValues) {
  const google = v.googleReviewUrl.trim();
  return {
    google_url: google.length ? google : null,
    channels: channelsObjectForMaster(v),
    whatsapp_country_code: v.whatsappEnabled
      ? normalizeDialCode(v.whatsappCountryCode || DEFAULT_DIAL_CODE)
      : null,
    whatsapp_number: v.whatsappEnabled ? clampWhatsAppLocalInput(v.whatsappNumber) : null,
  };
}

function provisionalSlugFromBrand(brand: string): string {
  const base = brand
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "business";
}

function masterTargetContextFromForm(v: FormValues, resourceUrls: string[] = []) {
  return {
    slug: provisionalSlugFromBrand(v.brandName || v.fullName),
    ...masterBaseFromFormValues(v),
    resource_urls: resourceUrls,
  };
}

type FormValues`,
);

s = s.replace(
  `  masterQrType: MasterQrType;
  aiEnabled: boolean;`,
  `  masterQrType: MasterQrType;
  masterQrTarget: MasterQrTarget;
  aiEnabled: boolean;`,
);

s = s.replace(
  `  masterQrType: "google_review",
  aiEnabled: false,`,
  `  masterQrType: "google_review",
  masterQrTarget: "review_page",
  aiEnabled: false,`,
);

s = s.replace(
  `"masterQrType",
          validateMasterQrSelection(masterBaseFromFormValues(norm), norm.masterQrType),`,
  `"masterQrTarget",
          validateMasterQrTargetSelection(
            masterTargetContextFromForm(norm),
            norm.masterQrTarget,
            resolvePublicAppOrigin(),
          ),`,
);

s = s.replace(
  /  useEffect\(\(\) => \{[\s\S]*?values\.masterQrType,\n  \]\);\n\n  const touchedRef/,
  `  useEffect(() => {
    const v = values;
    const err = validateMasterQrTargetForPersist(
      masterTargetContextFromForm(v),
      v.masterQrTarget,
      resolvePublicAppOrigin(),
    );
    if (!err || v.masterQrTarget === "review_page") return;
    const syncId = window.setTimeout(() => {
      setValues((s) =>
        s.masterQrTarget === "review_page" ? s : { ...s, masterQrTarget: "review_page" },
      );
    }, 0);
    return () => window.clearTimeout(syncId);
  }, [
    values.googleReviewUrl,
    values.instagramEnabled,
    values.instagramUrl,
    values.whatsappEnabled,
    values.whatsappCountryCode,
    values.whatsappNumber,
    values.facebookEnabled,
    values.facebookUrl,
    values.youtubeEnabled,
    values.youtubeUrl,
    values.websiteEnabled,
    values.websiteUrl,
    values.xEnabled,
    values.xUrl,
    values.masterQrTarget,
    values.brandName,
    values.fullName,
  ]);

  const touchedRef`,
);

s = s.replace(`    "masterQrType",`, `    "masterQrTarget",`);

s = s.replace(
  `        master_qr_type: normalizedValues.masterQrType,`,
  `        master_qr_type: normalizedValues.masterQrType,
        master_qr_target: normalizedValues.masterQrTarget,`,
);

s = s.replace(
  /              <label className="mt-2 flex cursor-pointer items-center gap-2[\s\S]*?<\/label>\n            <\/FormField>/,
  `            </FormField>`,
);

s = s.replace(
  `          <div className="grid gap-3 sm:grid-cols-2">
            <FormToggle
              id="directRedirect"
              label="Direct Redirect"
              description="Send happy customers straight to Google Reviews."`,
  `          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Master QR target</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Printed and emailed QR codes use <code className="text-[11px]">/m/{"{businessId}"}</code> and
              follow this target when scanned.
            </p>
            <div className="mt-3">
              <MasterQrTargetSelector
                value={values.masterQrTarget}
                context={masterTargetContextFromForm(values)}
                appOrigin={resolvePublicAppOrigin()}
                onSelect={(t) => patch("masterQrTarget")(t)}
              />
            </div>
            {errors.masterQrTarget ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.masterQrTarget}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormToggle
              id="directRedirect"
              label="Direct Redirect"
              description="Send happy customers straight to Google Reviews."`,
);

s = s.replace(
  'description="Optional links with per-channel enablement. Exactly one Master QR is active; pick which scan destination customers use first."',
  'description="Optional links shown on the public review page (tracked separately from master QR)."',
);

s = s.replace(
  /          \{errors\.masterQrType \? \([\s\S]*?\) : null\}\n          <div className="grid gap-4 lg:grid-cols-2">/,
  `          <div className="grid gap-4 lg:grid-cols-2">`,
);

s = s.replace(/\n              masterOption=\{[\s\S]*?\}\}/g, "");

s = s.replace(
  /                <label className="mt-2 flex cursor-pointer items-center gap-2[\s\S]*?whatsapp"\)\}\n                  className="accent-indigo-600[\s\S]*?<\/label>\n              \}\n            \/>/,
  `            />`,
);

fs.writeFileSync(p, s);
console.log("patched", p);
