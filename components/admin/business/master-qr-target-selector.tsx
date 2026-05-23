import {
  formatMasterQrTargetLabel,
  listMasterQrTargetEligibility,
  normalizeMasterQrTarget,
  type MasterQrTarget,
  type MasterQrTargetContext,
} from "@/lib/scan/master-qr-target";

const TARGET_ORDER: MasterQrTarget[] = [
  "review_page",
  "google_review",
  "instagram",
  "facebook",
  "whatsapp",
  "website",
  "youtube",
  "x",
  "resource",
];

function chipClass(selected: boolean, disabled: boolean): string {
  const base =
    "inline-flex min-w-0 flex-1 items-center justify-center rounded-lg border px-2.5 py-2.5 text-center text-xs font-medium transition sm:flex-none sm:min-w-[7rem] sm:text-sm";
  if (disabled) {
    return `${base} cursor-not-allowed border-zinc-200/60 bg-zinc-50 text-zinc-400 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-600`;
  }
  if (selected) {
    return `${base} border-indigo-300 bg-indigo-50 font-semibold text-indigo-900 shadow-sm ring-1 ring-indigo-200/80 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-100 dark:ring-indigo-800/60`;
  }
  return `${base} border-zinc-200/80 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900`;
}

export function MasterQrTargetSelector({
  value,
  context,
  appOrigin,
  disabled,
  onSelect,
}: {
  value: MasterQrTarget;
  context: Omit<MasterQrTargetContext, "master_qr_target" | "master_qr_type">;
  appOrigin: string;
  disabled?: boolean;
  onSelect: (target: MasterQrTarget) => void;
}) {
  const active = normalizeMasterQrTarget(value) ?? "review_page";
  const eligibility = listMasterQrTargetEligibility(context, appOrigin);
  const eligibleSet = new Set(
    eligibility.filter((e) => e.eligible).map((e) => e.target),
  );

  return (
    <div
      role="radiogroup"
      aria-label="Master QR target"
      className="flex flex-wrap gap-2"
    >
      {TARGET_ORDER.map((target) => {
        const eligible = eligibleSet.has(target);
        const selected = target === active;
        return (
          <button
            key={target}
            type="button"
            disabled={disabled || !eligible}
            role="radio"
            aria-checked={selected}
            title={
              !eligible
                ? `Configure a valid ${formatMasterQrTargetLabel(target)} link first`
                : undefined
            }
            onClick={() => onSelect(target)}
            className={chipClass(selected, disabled || !eligible)}
          >
            {formatMasterQrTargetLabel(target)}
          </button>
        );
      })}
    </div>
  );
}

export function MasterQrTargetDisplay({
  value,
}: {
  value: MasterQrTarget;
}) {
  const active = normalizeMasterQrTarget(value) ?? "review_page";
  return (
    <div
      role="status"
      className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100"
    >
      {formatMasterQrTargetLabel(active)}
    </div>
  );
}
