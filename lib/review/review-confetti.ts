"use client";

import confetti from "canvas-confetti";

type ConfettiOpts = NonNullable<Parameters<typeof confetti>[0]>;

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

/** One moderate burst after a successful review POST (public client only). */
export function playReviewSubmitSuccessConfetti(): void {
  if (typeof window === "undefined") return;
  if (reducedMotion()) return;

  const coarse = isCoarsePointer();
  const count = coarse ? 72 : 130;
  const defaults: ConfettiOpts = {
    origin: { y: 0.72 },
    zIndex: 9999,
    ticks: coarse ? 180 : 220,
    disableForReducedMotion: true,
  };

  void confetti({
    ...defaults,
    particleCount: count,
    spread: 78,
    startVelocity: coarse ? 38 : 48,
    scalar: coarse ? 0.82 : 1,
  });
}

/** Heavier burst when user confirms Google review (return flow). */
export function playGoogleReturnYesConfetti(): void {
  if (typeof window === "undefined") return;
  if (reducedMotion()) return;

  const count = isCoarsePointer() ? 120 : 200;
  const defaults: ConfettiOpts = {
    origin: { y: 0.7 },
    zIndex: 9999,
    disableForReducedMotion: true,
  };

  const fire = (opts: ConfettiOpts) => {
    void confetti({ ...defaults, ...opts });
  };

  fire({ particleCount: count, spread: 86, startVelocity: 55 });
  fire({
    particleCount: Math.max(1, Math.round(count * 0.35)),
    spread: 100,
    scalar: 0.85,
    ticks: 300,
  });
}
