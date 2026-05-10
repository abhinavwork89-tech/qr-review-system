"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type BannerSlide = {
  src: string;
  href: string;
  alt?: string;
};

export type BannerSliderProps = {
  banners: BannerSlide[];
  /** Autoplay interval in ms. Ignored when `banners.length <= 1` or reduced motion. */
  intervalMs?: number;
  className?: string;
  /** Tailwind aspect ratio class, e.g. `aspect-[21/8]` */
  aspectClassName?: string;
};

const SWIPE_PX = 48;

function BannerSlideImage({
  src,
  alt,
  priority,
  aspectClassName,
}: {
  src: string;
  alt: string;
  priority: boolean;
  aspectClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`relative w-full ${aspectClassName} flex items-center justify-center bg-zinc-200/90 text-center text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400`}
        role="img"
        aria-label={alt || "Banner image unavailable"}
      >
        Image unavailable
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectClassName}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        priority={priority}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function BannerSlider({
  banners,
  intervalMs = 5500,
  className = "",
  aspectClassName = "aspect-[21/8]",
}: BannerSliderProps) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerId = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const blockNextClick = useRef(false);

  const count = banners.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (count <= 1) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || reducedMotion) return;
    const t = window.setInterval(() => go(1), intervalMs);
    return () => window.clearInterval(t);
  }, [count, go, intervalMs, reducedMotion]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count]);

  if (count === 0) {
    return null;
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerId.current = e.pointerId;
    start.current = { x: e.clientX, y: e.clientY };
    blockNextClick.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported */
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId || !start.current) {
      return;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    pointerId.current = null;

    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;

    const horizontal =
      Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 0.75;
    if (!horizontal) return;

    blockNextClick.current = true;
    go(dx > 0 ? -1 : 1);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (pointerId.current === e.pointerId) {
      pointerId.current = null;
      start.current = null;
    }
  };

  const onBannerClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (blockNextClick.current) {
      e.preventDefault();
      blockNextClick.current = false;
    }
  };

  return (
    <section
      className={`relative w-full ${className}`.trim()}
      aria-roledescription="carousel"
      aria-label="Promotional banners"
    >
      <div
        className="relative touch-pan-y overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-800"
        onPointerDownCapture={onPointerDown}
        onPointerUpCapture={onPointerUp}
        onPointerCancelCapture={onPointerCancel}
      >
        <div
          className="flex w-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none"
          style={{ transform: `translate3d(-${index * 100}%,0,0)` }}
        >
          {banners.map((b, i) => (
            <div
              key={`${id}-${i}-${b.href}`}
              className="min-w-full shrink-0"
              aria-hidden={i !== index}
            >
              <a
                href={b.href}
                onClick={onBannerClick}
                className="block outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset dark:focus-visible:ring-zinc-500"
              >
                <BannerSlideImage
                  src={b.src}
                  alt={b.alt ?? ""}
                  priority={i === 0}
                  aspectClassName={aspectClassName}
                />
              </a>
            </div>
          ))}
        </div>
      </div>

      {count > 1 ? (
        <div
          className="mt-3 flex justify-center gap-1.5"
          role="tablist"
          aria-label="Banner slides"
        >
          {banners.map((_, i) => (
            <button
              suppressHydrationWarning
              key={`${id}-dot-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                i === index
                  ? "w-6 bg-zinc-800 dark:bg-zinc-200"
                  : "w-1.5 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500"
              }`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
