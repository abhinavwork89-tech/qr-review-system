"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useReviewT } from "@/components/review/review-i18n-provider";
import { isOptimizableRemoteImageUrl } from "@/lib/images/optimizable-image-url";
import { isProbablyImageResourceUrl } from "@/lib/review/parse-resource-urls";

type Props = {
  urls: string[];
};

export function ReviewDigitalResources({ urls }: Props) {
  const t = useReviewT();
  const baseId = useId();
  const safe = urls.filter((u) => u.trim().length > 0);
  if (safe.length === 0) return null;

  return (
    <section
      aria-label={t("resources.sectionAria")}
      className="digital-resource w-full  rounded-none sm:rounded-2xl bg-white p-4 box-shadow sm:p-5"
    >
      <div className="w-full section-head ">
        <h2 className="text-base sm:text-start font-semibold text-[var(--review-fg)]">
          {t("resources.title")}
        </h2>
        <p className="mt-0.5  text-sm leading-relaxed text-[var(--review-muted)]">
          {t("resources.subtitle")}
        </p>
      </div>
      <ul className="mt-4 grid list-none grid-cols-1 gap-3 sm:grid-cols-2" role="list">
        {safe.map((url, i) => (
          <li key={`${baseId}-res-${i}`} className="min-w-0">
            <ResourceTile key={url} url={url} labelOpen={t("resources.open")} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResourceTile({ url, labelOpen }: { url: string; labelOpen: string }) {
  const t = useReviewT();
  const isImg = isProbablyImageResourceUrl(url);
  const useNextImage = isImg && isOptimizableRemoteImageUrl(url);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isImg) return;
    loadTimerRef.current = setTimeout(() => setLoaded(true), 12_000);
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [isImg]);

  const onImgLoad = useCallback(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    setLoaded(true);
  }, []);

  if (isImg && !broken) {
    return (
      <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))]">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--review-primary)]"
        >
          <div className="relative aspect-[4/3] w-full bg-white ">
            {!loaded ? (
              <div
                className="absolute inset-0 animate-pulse bg-[color-mix(in_srgb,var(--review-fg)_8%,transparent)] motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
            {useNextImage ? (
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className={`p-3 object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"
                  }`}
                onLoad={onImgLoad}
                onError={() => setBroken(true)}
              />
            ) : (
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                sizes="(max-width: 640px) 100vw, 50vw"
                onLoad={onImgLoad}
                onError={() => setBroken(true)}
                className={`h-full w-full max-h-[280px] object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"
                  }`}
              />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] px-3 py-2">
            <span className="min-w-0 truncate text-xs text-[var(--review-muted)]" title={url}>
              {t("resources.imageAlt")}
            </span>
            <span className="shrink-0 text-xs font-medium text-[var(--review-primary)] group-hover:underline">
              {labelOpen}
            </span>
          </div>
        </a>
      </div>
    );
  }

  if (isImg && broken) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--review-fg)_18%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_92%,var(--review-fg))] px-3 py-6 text-center">
        <p className="text-xs text-[var(--review-muted)]">{t("resources.broken")}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[var(--review-primary)] underline-offset-2 hover:underline"
        >
          {labelOpen}
        </a>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3 text-sm text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span className="min-w-0 flex-1 truncate text-left text-xs text-[var(--review-muted)]" title={url}>
        {url.replace(/^https?:\/\//i, "")}
      </span>
      <span className="shrink-0 font-semibold text-[var(--review-primary)]">{labelOpen}</span>
    </a>
  );
}
