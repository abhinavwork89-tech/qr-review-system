"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REVEAL_THRESHOLD = 0.32;
const BRUSH_RADIUS = 32;
const LINE_WIDTH = BRUSH_RADIUS * 2.1;

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
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [fallbackMode] = useState(reducedMotion);
  const [canvasExiting, setCanvasExiting] = useState(false);
  const lastSampleRef = useRef(0);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);

  const finishReveal = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    drawingRef.current = false;
    lastPtRef.current = null;
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
    }, 320);
  }, [finishReveal]);

  useEffect(
    () => () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    },
    [],
  );

  const markDone = useCallback(() => {
    if (fallbackMode) {
      finishReveal();
      return;
    }
    triggerReveal();
  }, [fallbackMode, finishReveal, triggerReveal]);

  useEffect(() => {
    if (fallbackMode) return;
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

      ctx.globalCompositeOperation = "destination-out";
      lastPtRef.current = null;
    };

    paintOverlay();
    const ro = new ResizeObserver(() => {
      if (!doneRef.current && !exitingRef.current) paintOverlay();
    });
    ro.observe(wrap);

    const scratchStroke = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const scratchDot = (x: number, y: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    };

    const clientToLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const sampleProgress = () => {
      if (doneRef.current || exitingRef.current) return;
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;
      const stepX = Math.max(8, Math.floor(w / 40));
      const stepY = Math.max(8, Math.floor(h / 24));
      let cleared = 0;
      let total = 0;
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      for (let py = 0; py < h; py += stepY) {
        for (let px = 0; px < w; px += stepX) {
          total++;
          const i = (py * w + px) * 4 + 3;
          if (d[i]! < 18) cleared++;
        }
      }
      const ratio = total > 0 ? cleared / total : 0;
      if (ratio >= REVEAL_THRESHOLD) triggerReveal();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (doneRef.current || exitingRef.current) return;
      drawingRef.current = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const p = clientToLocal(e.clientX, e.clientY);
      lastPtRef.current = p;
      scratchDot(p.x, p.y);
      sampleProgress();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingRef.current || doneRef.current || exitingRef.current) return;
      const p = clientToLocal(e.clientX, e.clientY);
      const last = lastPtRef.current;
      if (last) {
        scratchStroke(last.x, last.y, p.x, p.y);
      } else {
        scratchDot(p.x, p.y);
      }
      lastPtRef.current = p;
      const now = performance.now();
      if (now - lastSampleRef.current > 160) {
        lastSampleRef.current = now;
        sampleProgress();
      }
    };

    const endStroke = () => {
      drawingRef.current = false;
      lastPtRef.current = null;
      sampleProgress();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endStroke);
      canvas.removeEventListener("pointercancel", endStroke);
    };
  }, [fallbackMode, markDone, triggerReveal]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,360px)] space-y-3">
      {!fallbackMode ? (
        <p className="text-center text-xs leading-relaxed text-[var(--review-muted)]">{scratchHint}</p>
      ) : (
        <button
          type="button"
          className="w-full rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3 text-sm font-medium text-[var(--review-fg)] shadow-sm"
          onClick={markDone}
        >
          {tapToReveal}
        </button>
      )}
      <div
        ref={wrapRef}
        className="relative h-[220px] w-full max-w-full overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--review-primary)_38%,transparent)] shadow-[0_16px_48px_rgba(0,0,0,0.14),0_0_0_1px_color-mix(in_srgb,var(--review-fg)_8%,transparent),inset_0_1px_0_color-mix(in_srgb,white_22%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--review-primary)_28%,transparent)]"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--review-bg) 94%, var(--review-primary) 6%), var(--review-bg))",
        }}
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
            fallbackMode && !revealed ? "scale-95 opacity-0" : "scale-100 opacity-100"
          } ${revealed ? "motion-safe:scale-[1.02] motion-safe:duration-300" : ""}`}
          aria-live="polite"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--review-muted)]">
            {"\u2728"}
          </p>
          <p className="bg-gradient-to-br from-[var(--review-fg)] to-[color-mix(in_srgb,var(--review-fg)_55%,var(--review-primary))] bg-clip-text text-2xl font-extrabold leading-tight text-transparent sm:text-[1.65rem]">
            {prize}
          </p>
        </div>
        {!fallbackMode ? (
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-[1] h-full w-full touch-none motion-safe:transition-[opacity,filter] motion-safe:duration-300 ${
              canvasExiting ? "pointer-events-none opacity-0 blur-[2px]" : "opacity-100"
            }`}
            style={{ touchAction: "none" }}
            aria-label={scratchHint}
          />
        ) : null}
      </div>
    </div>
  );
}
