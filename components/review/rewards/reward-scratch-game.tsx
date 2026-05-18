"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  prize: string;
  reducedMotion: boolean;
  onRevealComplete: () => void;
  scratchHint: string;
  tapToReveal: string;
};

export function RewardScratchGame({
  prize,
  reducedMotion,
  onRevealComplete,
  scratchHint,
  tapToReveal,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  const exitingRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [canvasExiting, setCanvasExiting] = useState(false);

  const finishReveal = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setRevealed(true);
    onRevealComplete();
  }, [onRevealComplete]);

  const triggerReveal = useCallback(() => {
    if (doneRef.current || exitingRef.current) return;
    exitingRef.current = true;
    setCanvasExiting(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      finishReveal();
    }, 280);
  }, [finishReveal]);

  useEffect(
    () => () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const paintOverlay = () => {
      if (doneRef.current || exitingRef.current) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 8 || h < 8) return;
      const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      const g = ctx.createLinearGradient(0, 0, w, h * 1.1);
      g.addColorStop(0, "#d8dce6");
      g.addColorStop(0.35, "#9aa3b8");
      g.addColorStop(0.5, "#b8c0d0");
      g.addColorStop(0.65, "#8b95a8");
      g.addColorStop(1, "#6b7280");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      for (let y = 0; y < h; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + w * 0.04);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,0.14)";
      for (let i = 0; i < 48; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const rw = 36 + Math.random() * 90;
        const rh = 6 + Math.random() * 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.9);
        ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
        ctx.restore();
      }
    };

    paintOverlay();
    const ro = new ResizeObserver(() => {
      if (!doneRef.current && !exitingRef.current) paintOverlay();
    });
    ro.observe(wrap);

    const onFirstInteraction = (e: PointerEvent) => {
      if (doneRef.current || exitingRef.current) return;
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      triggerReveal();
    };

    canvas.addEventListener("pointerdown", onFirstInteraction, { passive: false });
    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onFirstInteraction);
    };
  }, [reducedMotion, triggerReveal]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,360px)] space-y-3">
      <p className="text-center text-sm leading-relaxed text-[var(--review-muted)]">
        {reducedMotion ? tapToReveal : scratchHint}
      </p>
      <div
        ref={wrapRef}
        role="button"
        tabIndex={reducedMotion ? 0 : undefined}
        onKeyDown={
          reducedMotion
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  triggerReveal();
                }
              }
            : undefined
        }
        onClick={reducedMotion ? () => triggerReveal() : undefined}
        className={`relative h-[220px] w-full max-w-full overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--review-primary)_38%,transparent)] shadow-[0_16px_48px_rgba(0,0,0,0.14),0_0_0_1px_color-mix(in_srgb,var(--review-fg)_8%,transparent),inset_0_1px_0_color-mix(in_srgb,white_22%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--review-primary)_28%,transparent)] ${
          reducedMotion ? "cursor-pointer" : ""
        }`}
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--review-bg) 94%, var(--review-primary) 6%), var(--review-bg))",
        }}
        aria-label={reducedMotion ? tapToReveal : scratchHint}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% -10%, var(--review-primary), transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center transition-all duration-500 ease-out motion-reduce:transition-none ${
            revealed ? "scale-100 opacity-100" : "scale-95 opacity-0"
          } ${revealed ? "motion-safe:scale-[1.02] motion-safe:duration-300" : ""}`}
          aria-live="polite"
          aria-hidden={!revealed}
        >
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-[var(--review-muted)]">
            {"\u2728"}
          </p>
          <p className="bg-gradient-to-br from-[var(--review-fg)] to-[color-mix(in_srgb,var(--review-fg)_55%,var(--review-primary))] bg-clip-text text-2xl font-extrabold leading-tight text-transparent sm:text-[1.65rem]">
            {prize}
          </p>
        </div>
        {!reducedMotion ? (
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-[1] h-full w-full touch-none motion-safe:transition-[opacity,filter] motion-safe:duration-300 ${
              canvasExiting ? "pointer-events-none opacity-0 blur-[2px]" : "opacity-100"
            }`}
            style={{ touchAction: "none" }}
            aria-hidden={revealed}
          />
        ) : null}
      </div>
    </div>
  );
}
