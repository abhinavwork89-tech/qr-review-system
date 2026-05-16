"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  rewards: string[];
  winningIndex: number;
  reducedMotion: boolean;
  onAnimationComplete: () => void;
};

function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

/** Segment fill: alternates rich primary-tint vs soft surface (uses CSS vars from review theme). */
function segmentFillUrl(i: number): string {
  return i % 2 === 0 ? "url(#wheelSegRich)" : "url(#wheelSegSoft)";
}

export function RewardSpinWheel({
  rewards,
  winningIndex,
  reducedMotion,
  onAnimationComplete,
}: Props) {
  const n = rewards.length;
  const safeIndex = Math.min(Math.max(0, winningIndex), Math.max(0, n - 1));
  const sliceDeg = 360 / n;
  const completedRef = useRef(false);
  const rotateRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const targetRotation = useMemo(() => {
    if (n <= 0) return 0;
    const spins = reducedMotion ? 0 : 5;
    const full = 360 * spins;
    const pointerTopDeg = -90;
    const segmentCenterDeg = -90 + (safeIndex + 0.5) * sliceDeg;
    const align = pointerTopDeg - segmentCenterDeg;
    return full + align;
  }, [n, reducedMotion, safeIndex, sliceDeg]);

  useEffect(() => {
    completedRef.current = false;
    const el = rotateRef.current;
    if (!el) return;

    if (n <= 0) {
      onAnimationComplete();
      return;
    }

    el.style.transform = "rotate(0deg)";

    if (reducedMotion) {
      el.style.transform = `rotate(${targetRotation}deg)`;
      queueMicrotask(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onAnimationComplete();
        }
      });
      return;
    }

    const durationMs = 4500;
    const startRot = 0;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = easeOutQuart(t);
      const next = startRot + (targetRotation - startRot) * eased;
      el.style.transform = `rotate(${next}deg)`;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onAnimationComplete();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
    };
  }, [n, onAnimationComplete, reducedMotion, targetRotation]);

  if (n <= 0) return null;

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,300px)] flex-col items-center">
      <div
        className="pointer-events-none relative z-20 mb-1 flex h-9 w-14 items-end justify-center sm:h-10 sm:w-16"
        aria-hidden
      >
        <svg viewBox="0 0 56 36" className="h-full w-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
          <defs>
            <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--review-primary)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--review-primary) 55%, black)" />
            </linearGradient>
            <filter id="pinGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M 28 2 L 52 28 Q 28 38 28 38 Q 28 38 4 28 Z"
            fill="url(#pinGrad)"
            stroke="color-mix(in srgb, white 55%, transparent)"
            strokeWidth="1.2"
            filter="url(#pinGlow)"
          />
        </svg>
      </div>

      <div className="relative h-[min(72vw,280px)] w-[min(72vw,280px)] shrink-0 sm:h-[300px] sm:w-[300px]">
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--review-primary)_22%,transparent),transparent_62%)] opacity-90"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -inset-1 rounded-full bg-[radial-gradient(ellipse_at_50%_120%,rgba(0,0,0,0.22),transparent_55%)]"
          aria-hidden
        />

        <div
          ref={rotateRef}
          className="relative h-full w-full rounded-full will-change-transform"
          style={{
            transform: "rotate(0deg)",
            transformOrigin: "50% 50%",
            boxShadow:
              "0 0 0 1px color-mix(in srgb, var(--review-fg) 12%, transparent), 0 12px 40px rgba(0,0,0,0.18), inset 0 1px 0 color-mix(in srgb, white 35%, transparent)",
            transition: reducedMotion ? "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
          }}
        >
          <svg viewBox="-1.08 -1.08 2.16 2.16" className="h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="wheelSegRich" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--review-primary)" />
                <stop offset="100%" stopColor="color-mix(in srgb, var(--review-primary) 72%, var(--review-secondary))" />
              </linearGradient>
              <linearGradient id="wheelSegSoft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="color-mix(in srgb, var(--review-bg) 88%, var(--review-primary) 12%)" />
                <stop offset="100%" stopColor="color-mix(in srgb, var(--review-bg) 70%, var(--review-secondary) 18%)" />
              </linearGradient>
            </defs>
            <circle cx="0" cy="0" r="1.02" fill="none" stroke="color-mix(in srgb, var(--review-fg) 14%, transparent)" strokeWidth="0.02" />
            {rewards.map((label, i) => {
              const start = ((i / n) * 360 - 90) * (Math.PI / 180);
              const end = (((i + 1) / n) * 360 - 90) * (Math.PI / 180);
              const sweep = end - start;
              const large = sweep > Math.PI ? 1 : 0;
              const x1 = Math.cos(start);
              const y1 = Math.sin(start);
              const x2 = Math.cos(end);
              const y2 = Math.sin(end);
              const d = `M 0 0 L ${x1} ${y1} A 1 1 0 ${large} 1 ${x2} ${y2} Z`;
              const mid = ((i + 0.5) / n) * 360 - 90;
              const mr = (mid * Math.PI) / 180;
              const tx = Math.cos(mr) * 0.62;
              const ty = Math.sin(mr) * 0.62;
              const short =
                label.length > 12 ? `${label.slice(0, 10).trim()}…` : label;
              const fontSize = n > 10 ? 0.085 : n > 6 ? 0.095 : 0.11;
              return (
                <g key={`${i}-${label}`}>
                  <path
                    d={d}
                    fill={segmentFillUrl(i)}
                    stroke="color-mix(in srgb, white 28%, transparent)"
                    strokeWidth={0.008}
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={i % 2 === 0 ? "#ffffff" : "var(--review-fg)"}
                    fontSize={fontSize}
                    fontWeight="700"
                    fontFamily="system-ui,Segoe UI,sans-serif"
                    transform={`rotate(${mid + 90}, ${tx}, ${ty})`}
                    style={{ userSelect: "none", textShadow: i % 2 === 0 ? "0 1px 2px rgba(0,0,0,0.35)" : "none" }}
                  >
                    {short}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="pointer-events-none absolute inset-[14%] flex items-center justify-center rounded-full border border-[color-mix(in_srgb,white_40%,transparent)] bg-[radial-gradient(circle_at_30%_25%,color-mix(in_srgb,white_55%,var(--review-bg)),var(--review-bg)_55%,color-mix(in_srgb,var(--review-primary)_18%,var(--review-bg)))] shadow-[inset_0_2px_12px_rgba(0,0,0,0.12),0_4px_14px_rgba(0,0,0,0.12)]">
            <div className="flex h-[52%] w-[52%] items-center justify-center rounded-full bg-[linear-gradient(145deg,color-mix(in_srgb,var(--review-primary)_92%,white),color-mix(in_srgb,var(--review-primary)_55%,black))] text-[clamp(0.55rem,2.8vw,0.75rem)] font-extrabold uppercase tracking-[0.2em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_8px_rgba(0,0,0,0.2)] ring-2 ring-white/25">
              <span aria-hidden className="select-none">
                ★
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
