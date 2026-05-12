"use client";

import { useReviewI18n } from "@/components/review/review-i18n-provider";
import type { SupportedReviewLocale } from "@/lib/i18n/review-locale";

export function ReviewLanguageSwitcher() {
  const { locale, setLocale, t } = useReviewI18n();

  const select = (next: SupportedReviewLocale) => {
    if (next !== locale) setLocale(next);
  };

  return (
    <div
      className="flex shrink-0 flex-col items-end gap-1"
      role="group"
      aria-label={t("language.switchLabel")}
    >
      <span className="sr-only">{t("language.switchLabel")}</span>
      <div className="inline-flex rounded-lg border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => select("en")}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
            locale === "en"
              ? "bg-[var(--review-primary)] text-white shadow-sm"
              : "text-[var(--review-muted)] hover:text-[var(--review-fg)]"
          }`}
        >
          {t("language.english")}
        </button>
        <button
          type="button"
          onClick={() => select("hi")}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
            locale === "hi"
              ? "bg-[var(--review-primary)] text-white shadow-sm"
              : "text-[var(--review-muted)] hover:text-[var(--review-fg)]"
          }`}
        >
          {t("language.hindi")}
        </button>
      </div>
    </div>
  );
}
