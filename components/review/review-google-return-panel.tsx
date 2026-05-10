"use client";

import confetti from "canvas-confetti";
import { useCallback, useMemo } from "react";

type ConfettiOpts = NonNullable<Parameters<typeof confetti>[0]>;

export type ReviewReturnPhase = "question" | "yes_success" | "open_google_prompt";

type Props = {
  phase: ReviewReturnPhase;
  reviewUrl: string;
  reviewSourceLabel?: string;
  onYes: () => void;
  onNotYet: () => void;
  onNo: () => void;
};

function playConfettiBurst() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const count = 200;
  const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

  const fire = (opts: ConfettiOpts) => {
    confetti({ ...defaults, ...opts });
  };

  fire({ particleCount: count, spread: 86, startVelocity: 55 });
  fire({
    particleCount: Math.max(1, Math.round(count * 0.35)),
    spread: 100,
    scalar: 0.85,
    ticks: 300,
  });
}

export function ReviewGoogleReturnPanel({
  phase,
  reviewUrl,
  reviewSourceLabel = "Google",
  onYes,
  onNotYet,
  onNo,
}: Props) {
  const canOpenReviewUrl = useMemo(() => {
    const trimmed = reviewUrl.trim();
    try {
      const u = new URL(trimmed);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, [reviewUrl]);

  const handleYes = useCallback(() => {
    playConfettiBurst();
    onYes();
  }, [onYes]);

  const openGoogle = useCallback(() => {
    if (!canOpenReviewUrl) return;
    window.open(reviewUrl.trim(), "_blank", "noopener,noreferrer");
  }, [canOpenReviewUrl, reviewUrl]);

  if (phase === "yes_success") {
    return (
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--review-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_78%,var(--review-primary)_14%)] px-4 py-8 text-center sm:px-6 sm:py-10">
        <p className="text-base font-semibold text-[var(--review-fg)] sm:text-lg">
          Thank you — glad you submitted your review!
        </p>
        <p className="mt-2 text-sm text-[var(--review-muted)]">
          Your feedback helps others discover great businesses.
        </p>
      </div>
    );
  }

  if (phase === "open_google_prompt") {
    return (
      <div className="space-y-5 rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 sm:p-6">
        <p className="text-center text-sm font-medium text-[var(--review-fg)] sm:text-base">
          You can still submit your review
        </p>
        {canOpenReviewUrl ? (
          <button
            type="button"
            onClick={openGoogle}
            className="w-full rounded-xl bg-[var(--review-primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.99] motion-reduce:active:scale-100"
          >
            {`Open ${reviewSourceLabel} Review`}
          </button>
        ) : (
          <p className="text-center text-sm leading-relaxed text-[var(--review-muted)]">
            A public review link isn&apos;t available. Thank you for leaving
            feedback here.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 sm:p-6">
      <h2 className="text-center text-base font-semibold leading-snug text-[var(--review-fg)] sm:text-lg">
        Did you submit your review on Google?
      </h2>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleYes}
          className="w-full rounded-xl border-2 border-[var(--review-primary)] bg-[color-mix(in_srgb,var(--review-bg)_88%,var(--review-primary)_10%)] px-4 py-3.5 text-sm font-semibold text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_82%,var(--review-primary)_16%)] active:scale-[0.99] motion-reduce:active:scale-100"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={onNotYet}
          className="w-full rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3.5 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100"
        >
          Not Yet
        </button>
        <button
          type="button"
          onClick={onNo}
          className="w-full rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3.5 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100"
        >
          No
        </button>
      </div>
    </div>
  );
}
