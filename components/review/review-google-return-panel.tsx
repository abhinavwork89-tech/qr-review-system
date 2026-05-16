"use client";

import { useCallback, useMemo } from "react";
import { useReviewT } from "@/components/review/review-i18n-provider";
import { playGoogleReturnYesConfetti } from "@/lib/review/review-confetti";

export type ReviewReturnPhase = "question" | "yes_success" | "open_google_prompt";

type Props = {
  phase: ReviewReturnPhase;
  reviewUrl: string;
  reviewSourceLabel?: string;
  onYes: () => void;
  onNotYet: () => void;
  onNo: () => void;
};

export function ReviewGoogleReturnPanel({
  phase,
  reviewUrl,
  reviewSourceLabel = "Google",
  onYes,
  onNotYet,
  onNo,
}: Props) {
  const t = useReviewT();
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
    playGoogleReturnYesConfetti();
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
          {t("googleReturn.yesSuccessTitle")}
        </p>
        <p className="mt-2 text-sm text-[var(--review-muted)]">
          {t("googleReturn.yesSuccessBody")}
        </p>
      </div>
    );
  }

  if (phase === "open_google_prompt") {
    return (
      <div className="space-y-5 rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 sm:p-6">
        <p className="text-center text-sm font-medium text-[var(--review-fg)] sm:text-base">
          {t("googleReturn.openPromptTitle")}
        </p>
        {canOpenReviewUrl ? (
          <button
            type="button"
            onClick={openGoogle}
            className="w-full rounded-xl bg-[var(--review-primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.99] motion-reduce:active:scale-100"
          >
            {t("googleReturn.openReview", { label: reviewSourceLabel })}
          </button>
        ) : (
          <p className="text-center text-sm leading-relaxed text-[var(--review-muted)]">
            {t("googleReturn.noPublicLink")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 sm:p-6">
      <h2 className="text-center text-base font-semibold leading-snug text-[var(--review-fg)] sm:text-lg">
        {t("googleReturn.questionTitle")}
      </h2>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleYes}
          className="w-full rounded-xl border-2 border-[var(--review-primary)] bg-[color-mix(in_srgb,var(--review-bg)_88%,var(--review-primary)_10%)] px-4 py-3.5 text-sm font-semibold text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_82%,var(--review-primary)_16%)] active:scale-[0.99] motion-reduce:active:scale-100"
        >
          {t("googleReturn.yes")}
        </button>
        <button
          type="button"
          onClick={onNotYet}
          className="w-full rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3.5 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100"
        >
          {t("googleReturn.notYet")}
        </button>
        <button
          type="button"
          onClick={onNo}
          className="w-full rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3.5 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100"
        >
          {t("googleReturn.no")}
        </button>
      </div>
    </div>
  );
}
