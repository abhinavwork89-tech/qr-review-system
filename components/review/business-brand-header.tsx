"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useState } from "react";
import { useReviewT } from "@/components/review/review-i18n-provider";

export function BusinessBrandHeader({
  name,
  logoUrl,
  controls,
}: {
  name: string;
  logoUrl: string | null;
  controls?: ReactNode;
}) {
  const t = useReviewT();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(logoUrl?.trim()) && !logoFailed;

  return (
    <header className="client-header border-b border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[var(--review-primary)]">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-3 sm:px-3 py-3">
        {showLogo ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/80 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--review-fg)_8%,transparent)] sm:h-14 sm:w-14">
            <Image
              src={logoUrl!}
              alt={name}
              fill
              className="object-contain p-1.5"
              sizes="(max-width: 640px) 48px, 60px"
              priority
              onError={() => setLogoFailed(true)}
            />
          </div>
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white shadow-sm sm:h-14 sm:w-14 sm:text-lg"
            style={{ backgroundColor: "var(--review-primary)" }}
            aria-hidden
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--review-muted)] sm:text-xs">
            {t("header.leaveReview")}
          </p> */}
          <h1 className="truncate text-md font-semibold leading-snug tracking-tight text-white sm:text-base">
            {name}
          </h1>
        </div>
        {controls ? <div className="shrink-0 pt-0.5">{controls}</div> : null}
      </div>
    </header>
  );
}
