import fs from "fs";

const p = "components/admin/business/business-detail-editor.tsx";
let s = fs.readFileSync(p, "utf8");

s = s.replace(
  `import { BrandedQrTile } from "@/components/admin/business/branded-qr-tile";`,
  `import { BusinessQrSection } from "@/components/admin/business/business-qr-section";
import {
  MasterQrTargetDisplay,
  MasterQrTargetSelector,
} from "@/components/admin/business/master-qr-target-selector";`,
);

s = s.replace(
  `import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";
import { adminQrLabelToScanType } from "@/lib/scan/qr-types";
import {
  computeDefaultMasterQrType,
  formatMasterQrTypeLabel,
  normalizeMasterQrType,
  resolveMasterOutboundUrl,
  validateMasterQrForPersist,
  type MasterQrType,
} from "@/lib/scan/master-qr";`,
  `import { buildPublicReviewQrUrl } from "@/lib/qr/qr-urls";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";
import {
  computeDefaultMasterQrType,
  normalizeMasterQrType,
  type MasterQrType,
} from "@/lib/scan/master-qr";
import {
  buildMasterQrAbsoluteUrl,
  formatMasterQrTargetLabel,
  normalizeMasterQrTarget,
  type MasterQrTarget,
  validateMasterQrTargetForPersist,
} from "@/lib/scan/master-qr-target";`,
);

s = s.replace(
  "  validateMasterQrSelection,",
  "  validateMasterQrTargetSelection,",
);

s = s.replace(
  `  masterQrType: MasterQrType;
  aiEnabled: boolean;`,
  `  masterQrType: MasterQrType;
  masterQrTarget: MasterQrTarget;
  aiEnabled: boolean;`,
);

s = s.replace(
  /const MASTER_QR_GROUP_DETAIL = "masterQrEditBusiness";[\s\S]*?function detailValuesToMasterBase/,
  "function detailValuesToMasterBase",
);

if (!s.includes("detailValuesToMasterTargetContext")) {
  s = s.replace(
    /(function detailValuesToMasterBase\(v: DetailValues\) \{[\s\S]*?\n\})\n\nconst MAX_BANNER/,
    `$1

function detailValuesToMasterTargetContext(v: DetailValues) {
  return {
    ...detailValuesToMasterBase(v),
    slug: v.slug,
    resource_urls: v.resources,
    master_qr_target: v.masterQrTarget,
    master_qr_type: v.masterQrType,
  };
}

const MAX_BANNER`,
  );
}

s = s.replace(
  /  const publicUrl = useMemo\([\s\S]*?\}, \[values\]\);/,
  `  const appOrigin = useMemo(() => resolvePublicAppOrigin().replace(/\\/+$/, ""), []);

  const publicReviewQrUrl = useMemo(
    () => buildPublicReviewQrUrl(appOrigin, values.slug),
    [appOrigin, values.slug],
  );

  const masterQrPayloadUrl = useMemo(() => {
    if (values.status !== "active" || !values.id) return "";
    return buildMasterQrAbsoluteUrl(appOrigin, values.id);
  }, [values.status, values.id, appOrigin]);

  const masterTargetLabel = useMemo(
    () => formatMasterQrTargetLabel(values.masterQrTarget),
    [values.masterQrTarget],
  );

  const masterTargetContext = useMemo(
    () => detailValuesToMasterTargetContext(values),
    [values],
  );`,
);

s = s.replace(
  /  useEffect\(\(\) => \{\n    if \(!isEditing\) \{\n      queueMicrotask\(\(\) => setMasterQrError\(undefined\)\);[\s\S]*?values\.whatsappNumber,\n  \]\);/,
  `  useEffect(() => {
    if (!isEditing) {
      queueMicrotask(() => setMasterQrError(undefined));
      return;
    }
    queueMicrotask(() => {
      setMasterQrError(
        validateMasterQrTargetSelection(
          detailValuesToMasterTargetContext(values),
          values.masterQrTarget,
          appOrigin,
        ) ?? undefined,
      );
    });
  }, [
    isEditing,
    appOrigin,
    values.masterQrTarget,
    values.googleUrl,
    values.channels,
    values.whatsappCountryCode,
    values.whatsappNumber,
    values.resources,
    values.slug,
  ]);`,
);

s = s.replace(
  /  useEffect\(\(\) => \{\n    if \(!isEditing\) return;\n    const v = values;[\s\S]*?values\.masterQrType,\n  \]\);/,
  `  useEffect(() => {
    if (!isEditing) return;
    const v = values;
    const err = validateMasterQrTargetForPersist(
      detailValuesToMasterTargetContext(v),
      v.masterQrTarget,
      appOrigin,
    );
    if (!err || v.masterQrTarget === "review_page") return;
    const syncId = window.setTimeout(() => {
      setValues((s) =>
        s.masterQrTarget === "review_page" ? s : { ...s, masterQrTarget: "review_page" },
      );
    }, 0);
    return () => window.clearTimeout(syncId);
  }, [
    isEditing,
    appOrigin,
    values.googleUrl,
    values.channels,
    values.whatsappCountryCode,
    values.whatsappNumber,
    values.resources,
    values.masterQrTarget,
  ]);`,
);

s = s.replace(
  /    const masterBaseSave = detailValuesToMasterBase\(saveSnap\);\n    const masterErrSave = validateMasterQrForPersist\(\{[\s\S]*?\}\);/,
  `    const masterErrSave = validateMasterQrTargetForPersist(
      detailValuesToMasterTargetContext(saveSnap),
      saveSnap.masterQrTarget,
      appOrigin,
    );`,
);

s = s.replace(
  /<div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200\/80 bg-indigo-50\/60[\s\S]*?Change master under Review Settings and Channels \(Edit\)\.\n        <\/p>/,
  `<div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/25">
          <span className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Master target
          </span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{masterTargetLabel}</span>
          {values.directRedirect ? (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Direct redirect on
            </span>
          ) : (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Direct redirect off</span>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Master QR always uses <code className="text-[11px]">/m/{"{businessId}"}</code> and
          redirects to the selected target. Public Review QR always opens{" "}
          <code className="text-[11px]">/r/{"{slug}"}</code>. Change master target under Review
          Settings (Edit).`,
);

s = s.replace(
  /      \{values\.status === "active" \? \(\n        <>\n          <QrCodeCard[\s\S]*?<QrLinksCard values=\{values\} masterTrackUrl=\{masterTrackUrl\} \/>\n        <\/>\n      \) :/,
  `      {values.status === "active" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <BusinessQrSection
            title="Master QR"
            description={\`Permanent QR for print and email. Scans open the current master target (\${masterTargetLabel}).\`}
            payloadUrl={masterQrPayloadUrl}
            brandLabel={values.brandName || values.name || "business"}
            qrType="master"
            logoUrl={values.logoUrl.trim() ? values.logoUrl : null}
          />
          <BusinessQrSection
            title="Public Review QR"
            description="Always opens your branded public review page, independent of master target."
            payloadUrl={publicReviewQrUrl}
            brandLabel={values.brandName || values.name || "business"}
            qrType="review"
            logoUrl={values.logoUrl.trim() ? values.logoUrl : null}
          />
        </div>
      ) :`,
);

s = s.replace(/\{publicUrl\}/g, "{publicReviewQrUrl}");

s = s.replace(
  /              <label\n                className=\{`mt-2 flex items-center gap-2[\s\S]*?<\/label>\n            <\/FormField>/,
  "            </FormField>",
);

s = s.replace(
  `          <div className="grid gap-3 sm:grid-cols-2">
            <FormToggle
              id="directRedirect"`,
  `          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Master QR target</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Chooses where <code className="text-[11px]">/m/{"{businessId}"}</code> redirects.
              Social buttons on the review page still use tracked links for analytics.
            </p>
            <div className="mt-3">
              {!isEditing ? (
                <MasterQrTargetDisplay value={values.masterQrTarget} />
              ) : (
                <MasterQrTargetSelector
                  value={values.masterQrTarget}
                  context={masterTargetContext}
                  appOrigin={appOrigin}
                  disabled={!isEditing}
                  onSelect={(t) => setField("masterQrTarget")(t)}
                />
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormToggle
              id="directRedirect"`,
);

s = s.replace(
  'description="Enable links and choose exactly one Master QR for the primary scan destination."',
  'description="Enable social and website links for the public review page."',
);

s = s.replace(/\n              masterSelect=\{channelMasterSelect\([\s\S]*?\)\}/g, "");

s = s.replace(
  /function ChannelEditor\(\{[\s\S]*?masterSelect,\n\}: \{[\s\S]*?masterSelect\?: \{[\s\S]*?\};\n\}\) \{/,
  `function ChannelEditor({
  label,
  channel,
  onToggle,
  onUrl,
  disabled,
  urlError,
}: {
  label: string;
  channel: Channel;
  onToggle: (next: boolean) => void;
  onUrl: (next: string) => void;
  disabled: boolean;
  urlError?: string;
}) {`,
);

s = s.replace(
  /\n      \{masterSelect \? \([\s\S]*?\) : null\}\n    <\/div>\n  \);\n\}\n\nfunction MediaPreview/,
  `
    </div>
  );
}

function MediaPreview`,
);

s = s.replace(
  `  master_qr_type: MasterQrType;
  ai_enabled: boolean;`,
  `  master_qr_type: MasterQrType;
  master_qr_target: MasterQrTarget;
  ai_enabled: boolean;`,
);

s = s.replace(
  `    master_qr_type: v.masterQrType,
    ai_enabled: v.aiEnabled,`,
  `    master_qr_type: v.masterQrType,
    master_qr_target: v.masterQrTarget,
    ai_enabled: v.aiEnabled,`,
);

s = s.replace(
  `    a.master_qr_type !== b.master_qr_type ||
    a.ai_enabled !== b.ai_enabled ||`,
  `    a.master_qr_type !== b.master_qr_type ||
    a.master_qr_target !== b.master_qr_target ||
    a.ai_enabled !== b.ai_enabled ||`,
);

s = s.replace(
  `  if (cur.master_qr_type !== base.master_qr_type) {
    patch.master_qr_type = cur.master_qr_type;
  }`,
  `  if (cur.master_qr_type !== base.master_qr_type) {
    patch.master_qr_type = cur.master_qr_type;
  }
  if (cur.master_qr_target !== base.master_qr_target) {
    patch.master_qr_target = cur.master_qr_target;
  }`,
);

s = s.replace(
  /      if \(typeof result === "object" && result !== null && "master_qr_type" in result\) \{[\s\S]*?\}\n      setValues\(nextValues\);/,
  `      if (typeof result === "object" && result !== null) {
        if ("master_qr_target" in result) {
          const rawT = (result as { master_qr_target?: unknown }).master_qr_target;
          if (typeof rawT === "string") {
            const n = normalizeMasterQrTarget(rawT);
            if (n) nextValues = { ...nextValues, masterQrTarget: n };
          }
        }
        if ("master_qr_type" in result) {
          const rawM = (result as { master_qr_type?: unknown }).master_qr_type;
          if (typeof rawM === "string") {
            const n = normalizeMasterQrType(rawM);
            if (n) nextValues = { ...nextValues, masterQrType: n };
          } else if (rawM === null) {
            nextValues = {
              ...nextValues,
              masterQrType: computeDefaultMasterQrType(detailValuesToMasterBase(nextValues)),
            };
          }
        }
      }
      setValues(nextValues);`,
);

s = s.replace(
  /function whatsappQrIfEnabled[\s\S]*?function buildBusinessPublicUrl\(slug: string\): string \{[\s\S]*?\}\n\n\nfunction formatPlan/,
  "function formatPlan",
);

fs.writeFileSync(p, s);
console.log("patched", p);
