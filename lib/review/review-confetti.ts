"use client";

import confetti from "canvas-confetti";

type ConfettiOpts = NonNullable<Parameters<typeof confetti>[0]>;

const CONFETTI_Z = 10100;

function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function resetConfettiCanvas(): void {
  try {
    confetti.reset();
  } catch {
    /* ignore */
  }
}

function burst(opts: ConfettiOpts): void {
  if (typeof window === "undefined" || reducedMotion()) return;
  resetConfettiCanvas();
  void confetti({
    disableForReducedMotion: true,
    zIndex: CONFETTI_Z,
    ...opts,
  });
}

/** After successful review POST (public client). */
export function playReviewSubmitSuccessConfetti(): void {
  const coarse = isCoarsePointer();
  const count = coarse ? 80 : 140;
  burst({
    particleCount: count,
    spread: 82,
    startVelocity: coarse ? 36 : 50,
    origin: { y: 0.65 },
    ticks: coarse ? 200 : 240,
    scalar: coarse ? 0.85 : 1,
  });
}

/** Spin / scratch win (non–better-luck prizes). */
export function playRewardWinConfetti(): void {
  const coarse = isCoarsePointer();
  const count = coarse ? 90 : 160;
  const base: ConfettiOpts = {
    origin: { y: 0.62 },
    ticks: coarse ? 220 : 260,
    scalar: coarse ? 0.88 : 1,
  };

  burst({
    ...base,
    particleCount: count,
    spread: 75,
    startVelocity: coarse ? 40 : 52,
  });

  window.setTimeout(() => {
    if (reducedMotion()) return;
    burst({
      ...base,
      particleCount: Math.max(24, Math.round(count * 0.4)),
      spread: 100,
      startVelocity: 28,
      origin: { y: 0.55 },
    });
  }, 180);
}

/** Heavier burst when user confirms Google review (return flow). */
export function playGoogleReturnYesConfetti(): void {
  const count = isCoarsePointer() ? 120 : 200;
  const base: ConfettiOpts = {
    origin: { y: 0.7 },
    ticks: 300,
  };

  burst({ ...base, particleCount: count, spread: 86, startVelocity: 55 });
  window.setTimeout(() => {
    if (reducedMotion()) return;
    burst({
      ...base,
      particleCount: Math.max(20, Math.round(count * 0.35)),
      spread: 100,
      scalar: 0.85,
    });
  }, 200);
}
