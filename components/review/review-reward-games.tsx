"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useReviewT } from "@/components/review/review-i18n-provider";
import { postPublicRewardClaim } from "@/lib/reward/public-reward-claim";
import { playRewardWinConfetti } from "@/lib/review/review-confetti";
import { RewardScratchGame } from "@/components/review/rewards/reward-scratch-game";
import { RewardSpinWheel } from "@/components/review/rewards/reward-spin-wheel";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import Image from "next/image";

type Props = {
  businessId: string;
  spinEnabled: boolean;
  scratchEnabled: boolean;
  rewardConfig: string[];
};

type Phase = "closed" | "loading" | "playing" | "result" | "error";

function isBetterLuckMessage(prize: string): boolean {
  const s = prize.toLowerCase();
  return (
    s.includes("better luck") ||
    s.includes("bad luck") ||
    /next\s*time/i.test(s) ||
    s.includes("अगली बार") ||
    s.includes("बेहतर किस्मत")
  );
}

export function ReviewRewardGames({
  businessId,
  spinEnabled,
  scratchEnabled,
  rewardConfig,
}: Props) {
  const t = useReviewT();
  const titleId = useId();
  const rewards = useMemo(
    () => rewardConfig.map((v) => v.trim()).filter((v) => v.length > 0),
    [rewardConfig],
  );

  const [phase, setPhase] = useState<Phase>("closed");
  const [gameKind, setGameKind] = useState<"spin" | "scratch" | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [prize, setPrize] = useState<string | null>(null);
  const [winIndex, setWinIndex] = useState(0);
  const [wheelRewards, setWheelRewards] = useState<string[]>([]);
  const [spinUsed, setSpinUsed] = useState<boolean>(() => isUsed(businessId, "spin"));
  const [scratchUsed, setScratchUsed] = useState<boolean>(() =>
    isUsed(businessId, "scratch"),
  );
  const [isClaiming, setIsClaiming] = useState(false);

  const celebrationFired = useRef(false);
  const scratchRevealCommitted = useRef(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(phase !== "closed");

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  const resetModal = useCallback(() => {
    setPhase("closed");
    setGameKind(null);
    setClaimError(null);
    setPrize(null);
    setWheelRewards([]);
    setWinIndex(0);
    setIsClaiming(false);
    celebrationFired.current = false;
    scratchRevealCommitted.current = false;
  }, []);

  const fireWinCelebration = useCallback((prizeText: string | null) => {
    if (!prizeText || isBetterLuckMessage(prizeText)) return;
    if (celebrationFired.current) return;
    celebrationFired.current = true;
    requestAnimationFrame(() => playRewardWinConfetti());
  }, []);

  useEffect(() => {
    if (phase !== "closed") {
      document.body.dataset.reviewRewardModalOpen = "1";
      return () => {
        delete document.body.dataset.reviewRewardModalOpen;
      };
    }
    return;
  }, [phase]);

  useEffect(() => {
    if (phase === "closed" || phase === "loading") return;
    const tmr = window.setTimeout(() => closeBtnRef.current?.focus(), 80);
    return () => window.clearTimeout(tmr);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "closed") return;
      if (e.key === "Escape" && phase !== "loading") {
        e.preventDefault();
        resetModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, resetModal]);

  useEffect(() => {
    if (phase !== "result" || !prize) return;
    fireWinCelebration(prize);
  }, [phase, prize, fireWinCelebration]);

  const onSpinAnimationDone = useCallback(() => {
    setPhase("result");
  }, []);

  const onScratchRevealDone = useCallback(() => {
    if (scratchRevealCommitted.current) return;
    scratchRevealCommitted.current = true;
    markUsed(businessId, "scratch");
    setScratchUsed(true);
    clearPendingScratch(businessId);
    fireWinCelebration(prize);
    setPhase("result");
  }, [businessId, prize, fireWinCelebration]);

  if (rewards.length === 0) return null;
  if (!spinEnabled && !scratchEnabled) return null;

  const beginGame = async (kind: "spin" | "scratch") => {
    if (isClaiming) return;
    if (kind === "spin" && spinUsed) return;
    if (kind === "scratch" && scratchUsed) return;
    setIsClaiming(true);
    setClaimError(null);
    setPrize(null);
    setWheelRewards([]);
    setGameKind(kind);
    setPhase("loading");
    try {
      let res: Awaited<ReturnType<typeof postPublicRewardClaim>>;
      if (kind === "scratch") {
        const pending = readPendingScratch(businessId);
        res = pending ?? (await postPublicRewardClaim(businessId, kind));
        if (!pending) writePendingScratch(businessId, res);
      } else {
        res = await postPublicRewardClaim(businessId, kind);
      }
      const list = res.rewards.length > 0 ? res.rewards : rewards;
      setWheelRewards(list);
      const idx = Math.min(Math.max(0, res.index), Math.max(0, list.length - 1));
      setWinIndex(idx);
      setPrize(res.prize || list[idx] || list[0] || "");
      if (kind === "spin") {
        markUsed(businessId, kind);
        setSpinUsed(true);
      }
      setPhase("playing");
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : t("rewards.errorGeneric"));
      setPhase("error");
    } finally {
      setIsClaiming(false);
    }
  };

  const showResult = phase === "result" && prize;
  const better = prize ? isBetterLuckMessage(prize) : false;

  return (
    <>
      <section
        aria-label={t("rewards.sectionAria")}
          className="reward-game-section w-full  rounded-none sm:rounded-2xl bg-white p-4 box-shadow sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {spinEnabled ? (
            spinUsed ? (
              <p className="text-sm  text-[var(--review-fg)]">{t("rewards.spinUsed")}</p>
            ) : (
              <>
              <div className="reward-banner">
                    <Image
                      src="/images/reward-spin-banner.png"
                      alt="spin banner"
                      width={600}
                      height={200}
                      className="object-contain reward-banner-img"
                    />
                <button
                  type="button"
                  disabled={isClaiming}
                  onClick={() => void beginGame("spin")}
                  className="reward-btn flex gap-1.5 bg-white items-center rounded-xl"
                >
                  <>
                        <Image
                          src="/images/spin-icon.png"
                          alt="spin icon"
                          width={20}
                          height={20}
                          className="object-contain btn-icon"
                        />
                  </>
                  {t("rewards.spinCta")}
                </button>
              </div>             
              </>
            )
          ) : null}
          {scratchEnabled ? (
            scratchUsed ? (
              <p className="text-sm font-semibold text-[var(--review-fg)] text-center">
                {t("rewards.scratchUsed")}
              </p>
            ) : (
              <div className="reward-banner">
                  <Image
                    src="/images/reward-scratch-banner.png"
                    alt="scratch banner"
                    width={600}
                    height={200}
                    className="object-contain reward-banner-img"
                  />
                <button
                  type="button"
                  disabled={isClaiming}
                  onClick={() => void beginGame("scratch")}
                  className="reward-btn flex gap-1.5 bg-white items-center rounded-xl"
                >
                  <>
                         <Image
                          src="/images/scratch-icon.png"
                          alt="scratch icon"
                          width={20}
                          height={20}
                          className="object-contain btn-icon"
                        />
                  </>
                  {t("rewards.scratchCta")}
                </button>
              </div>
            )
          ) : null}
        </div>
      </section>

      {phase !== "closed" ? (
        <div
          className="fixed inset-0 z-[93] flex items-center justify-center bg-zinc-950/50 px-3 py-6 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (phase !== "loading") resetModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`flex max-h-[min(92dvh,680px)] w-full max-w-md flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-2xl sm:p-6 ${
              phase === "loading" || phase === "playing" || phase === "result"
                ? "min-h-[min(400px,40svh)] justify-center"
                : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {phase === "loading" ? (
              <div className="flex min-h-[min(280px,40svh)] flex-col items-center justify-center gap-4 py-8">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--review-primary)_35%,transparent)] border-t-[var(--review-primary)]"
                  aria-hidden
                />
                <p id={titleId} className="text-sm text-[var(--review-muted)]">
                  {t("rewards.loadingReward")}
                </p>
              </div>
            ) : null}

            {phase === "error" ? (
              <div className="space-y-4 py-2">
                <h2 id={titleId} className="text-base font-semibold text-[var(--review-fg)]">
                  {t("rewards.errorTitle")}
                </h2>
                <p className="text-sm text-[var(--review-muted)]">{claimError}</p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] px-4 py-2.5 text-sm font-medium text-[var(--review-fg)]"
                    onClick={resetModal}
                  >
                    {t("rewards.close")}
                  </button>
                  {gameKind ? (
                    <button
                      ref={closeBtnRef}
                      type="button"
                      className="rounded-xl bg-[var(--review-primary)] px-4 py-2.5 text-sm font-semibold text-white"
                      onClick={() => void beginGame(gameKind)}
                    >
                      {t("rewards.tryAgain")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {phase === "playing" && gameKind === "spin" && wheelRewards.length > 0 ? (
              <div className="flex min-h-[min(360px,52svh)] w-full flex-col items-center justify-center gap-3 overflow-hidden px-0 py-2">
                <h2 id={titleId} className="text-center text-sm font-semibold text-[var(--review-fg)]">
                  {t("rewards.spinPlaying")}
                </h2>
                <RewardSpinWheel
                  rewards={wheelRewards}
                  winningIndex={winIndex}
                  reducedMotion={reducedMotion}
                  onAnimationComplete={onSpinAnimationDone}
                />
              </div>
            ) : null}

            {phase === "playing" && gameKind === "scratch" && prize ? (
              <div className="flex w-full flex-col items-center justify-center gap-2  px-0 py-1 bg-white">
                <h2 id={titleId} className="text-center text-sm font-semibold text-[var(--review-fg)]">
                  {t("rewards.scratchPlaying")}
                </h2>
                <RewardScratchGame
                  prize={prize}
                  reducedMotion={reducedMotion}
                  onRevealComplete={onScratchRevealDone}
                  scratchHint={t("rewards.scratchHint")}
                  tapToReveal={t("rewards.tapToReveal")}
                />
              </div>
            ) : null}

            {showResult ? (
              <div className="relative mx-auto w-full max-w-sm space-y-6 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--review-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_92%,var(--review-primary)_6%)] px-5 py-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.1)] sm:px-8">
                <div
                  className="pointer-events-none absolute -left-1/4 top-0 h-40 w-[150%] bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--review-primary)_35%,transparent),transparent_65%)] opacity-90"
                  aria-hidden
                />
                <div className="relative space-y-4">
                  <h2
                    id={titleId}
                    className="text-xl font-bold tracking-tight text-[var(--review-fg)] motion-safe:[animation:reward-result-fade_0.45s_ease-out_1_forwards] sm:text-2xl"
                  >
                    {better ? t("rewards.betterLuckTitle") : t("rewards.congratsTitle")}
                  </h2>
                  <p className="text-3xl font-extrabold leading-tight text-[var(--review-primary)] motion-safe:[animation:reward-result-fade_0.5s_ease-out_1_forwards] motion-safe:drop-shadow-[0_2px_24px_color-mix(in_srgb,var(--review-primary)_45%,transparent)] sm:text-[2rem]">
                    {prize}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--review-muted)] motion-safe:[animation:reward-result-fade_0.55s_ease-out_1_forwards]">
                    {better ? t("rewards.betterLuckBody") : t("rewards.congratsBody", { prize })}
                  </p>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    className="mt-2 w-full min-h-12 rounded-xl bg-[var(--review-primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_color-mix(in_srgb,var(--review-primary)_55%,transparent)] transition hover:brightness-110 active:scale-[0.99] motion-reduce:active:scale-100"
                    onClick={resetModal}
                  >
                    {t("rewards.close")}
                  </button>
                </div>
              </div>
            ) : null}
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
    /* ignore */
  }
}

type PendingScratchClaim = {
  prize: string;
  index: number;
  rewards: string[];
};

function pendingScratchKey(id: string): string {
  return `reward:scratch:pending:${id}`;
}

function readPendingScratch(id: string): PendingScratchClaim | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(pendingScratchKey(id));
    if (!raw) return null;
    const o = JSON.parse(raw) as PendingScratchClaim;
    if (typeof o.prize !== "string" || !Array.isArray(o.rewards)) return null;
    return {
      prize: o.prize,
      index: typeof o.index === "number" ? o.index : 0,
      rewards: o.rewards.filter((s): s is string => typeof s === "string" && s.length > 0),
    };
  } catch {
    return null;
  }
}

function writePendingScratch(id: string, claim: PendingScratchClaim) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(pendingScratchKey(id), JSON.stringify(claim));
  } catch {
    /* ignore */
  }
}

function clearPendingScratch(id: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(pendingScratchKey(id));
  } catch {
    /* ignore */
  }
}
