"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  normalizeReviewLocale,
  readStoredReviewLocale,
  REVIEW_LOCALE_STORAGE_KEY,
  type SupportedReviewLocale,
} from "@/lib/i18n/review-locale";
import { translateReview } from "@/lib/i18n/review-messages";

type Ctx = {
  locale: SupportedReviewLocale;
  businessDefaultLocale: SupportedReviewLocale;
  setLocale: (next: SupportedReviewLocale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const ReviewI18nContext = createContext<Ctx | null>(null);

const DEBUG = process.env.NEXT_PUBLIC_REVIEW_I18N_DEBUG === "1";

export function ReviewI18nProvider({
  businessDefaultLocale,
  slug,
  children,
}: {
  businessDefaultLocale: string;
  slug: string;
  children: React.ReactNode;
}) {
  const businessNorm = useMemo(
    () => normalizeReviewLocale(businessDefaultLocale),
    [businessDefaultLocale],
  );

  const [locale, setLocaleState] = useState<SupportedReviewLocale>(() =>
    readStoredReviewLocale(businessNorm),
  );

  useLayoutEffect(() => {
    if (!DEBUG) return;
    let storedRaw: string | null = null;
    try {
      storedRaw = localStorage.getItem(REVIEW_LOCALE_STORAGE_KEY);
    } catch {
      storedRaw = null;
    }
    console.warn("[review-i18n]", {
      slug,
      namespace: "review",
      businessRaw: businessDefaultLocale,
      businessNorm,
      localStorageRaw: storedRaw,
      resolvedLocale: locale,
    });
  }, [businessNorm, businessDefaultLocale, slug, locale]);

  const setLocale = useCallback((next: SupportedReviewLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(REVIEW_LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    if (DEBUG) {
      console.warn("[review-i18n:setLocale]", { next });
    }
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      translateReview(locale, path, vars),
    [locale],
  );

  const value = useMemo<Ctx>(
    () => ({
      locale,
      businessDefaultLocale: businessNorm,
      setLocale,
      t,
    }),
    [locale, businessNorm, setLocale, t],
  );

  return (
    <ReviewI18nContext.Provider value={value}>
      <div lang={locale} className="flex min-h-full flex-1 flex-col">
        {children}
      </div>
    </ReviewI18nContext.Provider>
  );
}

export function useReviewI18n(): Ctx {
  const ctx = useContext(ReviewI18nContext);
  if (!ctx) {
    throw new Error("useReviewI18n must be used within ReviewI18nProvider");
  }
  return ctx;
}

export function useReviewT(): (path: string, vars?: Record<string, string | number>) => string {
  const { t } = useReviewI18n();
  return t;
}
