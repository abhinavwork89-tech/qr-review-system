"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getPreferredPublicUrl, isSafeHttpUrl } from "@/lib/review/business-config";
import type { BusinessChannels } from "@/lib/types/business";

type Props = {
  googleReviewUrl: string;
  channels: BusinessChannels | null;
  /** When true, social-channel prompts are suppressed (Google-only redirect mode). */
  directRedirect?: boolean;
  /** Scope “show once” per business page. */
  pageSlug?: string;
  delayMs?: number;
  targetId?: string;
};

export function ReviewDelayedModal({
  googleReviewUrl,
  channels,
  directRedirect = false,
  pageSlug = "",
  delayMs = 10_000,
  targetId = "review-flow",
}: Props) {
  const [open, setOpen] = useState(false);
  const shownOnceRef = useRef(false);
  const sessionKey = useMemo(() => {
    const slugPart = pageSlug.trim().toLowerCase() || "page";
    const g = googleReviewUrl.trim().toLowerCase() || "no-google";
    return `delayed-review-once:${slugPart}:${g}`;
  }, [googleReviewUrl, pageSlug]);

  const shouldTrigger = useMemo(() => {
    if (directRedirect) return false;
    if (!isSafeHttpUrl(googleReviewUrl)) return false;
    const preferred = getPreferredPublicUrl({ googleReviewUrl, channels });
    return preferred.sourceLabel !== "Google";
  }, [channels, directRedirect, googleReviewUrl]);

  useEffect(() => {
    if (!shouldTrigger || shownOnceRef.current) return;
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(sessionKey) === "1") return;
      } catch {
        // ignore storage issues
      }
    }
    const timer = window.setTimeout(() => {
      if (document.body.dataset.reviewModalOpen === "1") return;
      if (document.body.dataset.reviewRewardModalOpen === "1") return;
      shownOnceRef.current = true;
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // ignore storage issues
      }
      document.body.dataset.reviewModalOpen = "1";
      setOpen(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, sessionKey, shouldTrigger]);

  useEffect(() => {
    if (!open && document.body.dataset.reviewModalOpen === "1") {
      delete document.body.dataset.reviewModalOpen;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[88] flex items-center justify-center bg-zinc-950/45 px-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delayed-review-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          id="delayed-review-title"
          className="text-base font-semibold text-[var(--review-fg)]"
        >
          Would you like to rate our service?
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-3.5 py-2 text-sm font-medium text-[var(--review-fg)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))]"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              const el = document.getElementById(targetId);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--review-primary)] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
