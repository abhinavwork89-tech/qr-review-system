"use client";

import type { AppSettingsPublic } from "@/lib/data/app-settings";
import { useReviewT } from "@/components/review/review-i18n-provider";

export function ReviewPageFooter({ settings }: { settings: AppSettingsPublic }) {
  const t = useReviewT();
  const s = settings;

  let linkLabel = "OneCore";
  try {
    linkLabel =
      new URL(s.poweredByUrl.trim()).hostname.replace(/^www\./, "") || linkLabel;
  } catch {
    /* keep default */
  }

  return (
    <footer
      className="mt-auto px-4 py-4 sm:px-5 sm:py-5"
      style={{
        borderTop:
          "1px solid color-mix(in srgb, var(--review-fg) 12%, transparent)",
        backgroundColor:
          "color-mix(in srgb, var(--review-bg) 92%, var(--review-fg))",
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2 sm:gap-y-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[13px] leading-snug text-[var(--review-muted)] sm:text-sm">
            {t("footer.poweredBy")}
          </span>
          {s.brandingLogoUrl ? (
            <span className="relative inline-flex h-7 max-w-[160px] items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL comes from admin-configured storage */}
              <img
                src={s.brandingLogoUrl}
                alt=""
                className="h-7 w-auto max-h-7 max-w-[160px] object-contain object-center"
              />
            </span>
          ) : null}
          <a
            href={s.poweredByUrl || "https://onecore.example"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold leading-snug tracking-wide text-[var(--review-primary)] underline-offset-4 hover:underline sm:text-sm"
          >
            {linkLabel}
          </a>
        </div>
        <p className="w-full max-w-full text-[12px] leading-snug text-[var(--review-muted)] sm:w-auto">
          © {s.copyrightYear}
          {s.copyrightText.trim() ? ` ${s.copyrightText.trim()}` : ""}
        </p>
      </div>
    </footer>
  );
}
