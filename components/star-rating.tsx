"use client";

import { useCallback, useId, useRef, useState } from "react";

const STAR_PATH =
  "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

export type StarRatingProps = {
  /** Controlled value (1–5). Omit with `defaultValue` for uncontrolled. */
  value?: number;
  defaultValue?: number;
  /** Called with 1–5 when the user selects a star. */
  onChange?: (rating: number) => void;
  disabled?: boolean;
  className?: string;
  /** Accessible name for the star group. */
  label?: string;
};

export function StarRating({
  value: controlledValue,
  defaultValue = 0,
  onChange,
  disabled = false,
  className = "",
  label = "Star rating",
}: StarRatingProps) {
  const id = useId();
  const starsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [internal, setInternal] = useState(() =>
    clampRating(defaultValue),
  );
  const isControlled = controlledValue !== undefined;
  const rating = clampRating(isControlled ? controlledValue : internal);

  const commit = useCallback(
    (next: number): boolean => {
      const v = clampRating(next);
      if (disabled || v === 0 || v === rating) return false;
      if (!isControlled) setInternal(v);
      onChange?.(v);
      return true;
    },
    [disabled, isControlled, onChange, rating],
  );

  const focusStar = (star: number) => {
    starsRef.current[star - 1]?.focus();
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 sm:gap-1 ${className}`.trim()}
    >
      <div
        id={`${id}-label`}
        className="sr-only"
      >
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="flex items-center"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = rating >= n;
          return (
            <button
              suppressHydrationWarning
              key={n}
              ref={(el) => {
                starsRef.current[n - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={rating === n}
              tabIndex={rating === n || (rating === 0 && n === 1) ? 0 : -1}
              disabled={disabled}
              onClick={() => commit(n)}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const next = Math.min(5, n + 1);
                  if (commit(next)) {
                    queueMicrotask(() => focusStar(next));
                  }
                }
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = Math.max(1, n - 1);
                  if (commit(next)) {
                    queueMicrotask(() => focusStar(next));
                  }
                }
              }}
              className="group flex h-12 w-12 touch-manipulation items-center justify-center rounded-lg text-amber-500 outline-none transition-[transform,background-color] duration-200 ease-out hover:bg-amber-500/10 active:scale-[0.94] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40 dark:focus-visible:ring-offset-zinc-950"
            >
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"}
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.12] group-active:scale-95 motion-reduce:group-hover:scale-100 motion-reduce:group-active:scale-100"
                aria-hidden
              >
                <path
                  d={STAR_PATH}
                  className={
                    selected
                      ? "fill-current stroke-amber-600/90 stroke-[0.5] transition-[fill,stroke] duration-200 ease-out"
                      : "fill-transparent stroke-zinc-300 stroke-[1.25] transition-[fill,stroke] duration-200 ease-out dark:stroke-zinc-600"
                  }
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function clampRating(n: number): number {
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}
