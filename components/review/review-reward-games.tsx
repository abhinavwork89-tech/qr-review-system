"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  businessId: string;
  spinEnabled: boolean;
  scratchEnabled: boolean;
  rewardConfig: string[];
};

export function ReviewRewardGames({
  businessId,
  spinEnabled,
  scratchEnabled,
  rewardConfig,
}: Props) {
  const rewards = useMemo(
    () => rewardConfig.map((v) => v.trim()).filter((v) => v.length > 0),
    [rewardConfig],
  );

  const [result, setResult] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [spinUsed, setSpinUsed] = useState<boolean>(() => isUsed(businessId, "spin"));
  const [scratchUsed, setScratchUsed] = useState<boolean>(() =>
    isUsed(businessId, "scratch"),
  );

  useEffect(() => {
    if (open) {
      document.body.dataset.reviewRewardModalOpen = "1";
      return () => {
        delete document.body.dataset.reviewRewardModalOpen;
      };
    }
    return;
  }, [open]);

  if (rewards.length === 0) return null;
  if (!spinEnabled && !scratchEnabled) return null;

  const runGame = (kind: "spin" | "scratch") => {
    if (kind === "spin" && spinUsed) return;
    if (kind === "scratch" && scratchUsed) return;
    const won = rewards[Math.floor(Math.random() * rewards.length)] ?? "Better Luck";
    markUsed(businessId, kind);
    if (kind === "spin") setSpinUsed(true);
    if (kind === "scratch") setScratchUsed(true);
    setResult(won);
    setOpen(true);
  };

  return (
    <>
      <section
        aria-label="Rewards"
        className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {spinEnabled ? (
            spinUsed ? (
              <p className="text-sm text-[var(--review-muted)]">
                You&apos;ve already claimed your spin reward.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => runGame("spin")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--review-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Spin
              </button>
            )
          ) : null}
          {scratchEnabled ? (
            scratchUsed ? (
              <p className="text-sm text-[var(--review-muted)]">
                You&apos;ve already claimed your scratch reward.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => runGame("scratch")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-2.5 text-sm font-semibold text-[var(--review-fg)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))]"
              >
                Scratch
              </button>
            )
          ) : null}
        </div>
      </section>

      {open && result ? (
        <div
          className="fixed inset-0 z-[93] flex items-center justify-center bg-zinc-950/45 px-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-[var(--review-fg)]">
              You won: {result}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--review-primary)] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function storageKey(id: string, kind: "spin" | "scratch"): string {
  return `reward:${kind}:${id}`;
}

function isUsed(id: string, kind: "spin" | "scratch"): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(storageKey(id, kind)) === "1";
  } catch {
    return false;
  }
}

function markUsed(id: string, kind: "spin" | "scratch") {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(id, kind), "1");
  } catch {
    // ignore storage errors
  }
}
