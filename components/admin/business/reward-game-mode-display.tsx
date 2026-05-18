import { CircleOff, RotateCw, Ticket } from "lucide-react";

export type RewardGameMode = "none" | "spin" | "scratch";

export function resolveRewardGameMode(
  spinEnabled: boolean,
  scratchEnabled: boolean,
): RewardGameMode {
  if (spinEnabled) return "spin";
  if (scratchEnabled) return "scratch";
  return "none";
}

const MODE_META: Record<
  RewardGameMode,
  { label: string; shortLabel: string; Icon: typeof CircleOff }
> = {
  none: { label: "No reward game enabled", shortLabel: "None", Icon: CircleOff },
  spin: { label: "Spin Wheel", shortLabel: "Spin", Icon: RotateCw },
  scratch: { label: "Scratch Card", shortLabel: "Scratch", Icon: Ticket },
};

const MODES: RewardGameMode[] = ["none", "spin", "scratch"];

function modeChipClass(selected: boolean, interactive: boolean): string {
  const base =
    "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition sm:flex-none sm:min-w-[7.5rem]";
  if (selected) {
    return `${base} border-indigo-300 bg-indigo-50 font-semibold text-indigo-900 shadow-sm ring-1 ring-indigo-200/80 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-100 dark:ring-indigo-800/60`;
  }
  if (interactive) {
    return `${base} border-zinc-200/80 bg-white font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900`;
  }
  return `${base} border-zinc-200/80 bg-white/60 font-medium text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-500`;
}

function modeIconClass(selected: boolean, interactive: boolean): string {
  if (selected) return "text-indigo-600 dark:text-indigo-300";
  if (interactive) return "text-zinc-500 dark:text-zinc-400";
  return "text-zinc-400 dark:text-zinc-600";
}

/** Read-only reward game indicator for business detail view mode. */
export function RewardGameModeDisplay({
  spinEnabled,
  scratchEnabled,
}: {
  spinEnabled: boolean;
  scratchEnabled: boolean;
}) {
  const active = resolveRewardGameMode(spinEnabled, scratchEnabled);

  return (
    <div
      role="status"
      aria-label={`Active reward game: ${MODE_META[active].label}`}
      className="flex flex-wrap gap-2"
    >
      {MODES.map((mode) => {
        const { label, shortLabel, Icon } = MODE_META[mode];
        const selected = mode === active;
        return (
          <div
            key={mode}
            className={modeChipClass(selected, false)}
            aria-current={selected ? "true" : undefined}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${modeIconClass(selected, false)}`}
              aria-hidden
            />
            <span className="truncate">
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Button-style reward game selector (add / edit business). */
export function RewardGameModeSelector({
  spinEnabled,
  scratchEnabled,
  disabled,
  onSelect,
}: {
  spinEnabled: boolean;
  scratchEnabled: boolean;
  disabled?: boolean;
  onSelect: (mode: RewardGameMode) => void;
}) {
  const active = resolveRewardGameMode(spinEnabled, scratchEnabled);

  return (
    <div
      role="radiogroup"
      aria-label="Reward game mode"
      className="flex flex-wrap gap-2"
    >
      {MODES.map((mode) => {
        const { label, shortLabel, Icon } = MODE_META[mode];
        const selected = mode === active;
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(mode)}
            className={`${modeChipClass(selected, !disabled)} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${modeIconClass(selected, true)}`}
              aria-hidden
            />
            <span className="truncate">
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
