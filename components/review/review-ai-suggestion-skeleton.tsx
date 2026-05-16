"use client";

import { memo } from "react";

/** Placeholder cards while AI suggestions load (premium shimmer). */
export const ReviewAiSuggestionSkeleton = memo(function ReviewAiSuggestionSkeleton({
  rows = 3,
}: {
  rows?: number;
}) {
  const n = Math.min(5, Math.max(1, Math.floor(rows)));
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <li
          key={i}
          className="relative h-[4.75rem] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_92%,var(--review-fg))]"
        >
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--review-primary)_24%,transparent)] to-transparent"
            style={{
              animation: `review-ai-shimmer 1.35s ease-in-out infinite`,
              animationDelay: `${i * 120}ms`,
            }}
          />
        </li>
      ))}
    </ul>
  );
});
