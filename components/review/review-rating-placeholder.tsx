"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { StarRating } from "@/components/star-rating";
import {
  ReviewGoogleReturnPanel,
  type ReviewReturnPhase,
} from "@/components/review/review-google-return-panel";
import {
  getPreferredPublicUrl,
  isSafeHttpUrl,
  resolveGoogleReviewSubmitRedirect,
} from "@/lib/review/business-config";
import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import { reviewSourceLabelToScanType } from "@/lib/scan/qr-types";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  joinDialAndLocal,
  sanitizePhoneLocalInput,
  validateInternationalPhone,
} from "@/lib/phone/mobile";
import { aiReviewDebug } from "@/lib/review/ai-review-debug";
import {
  persistGoogleReviewConfirmed,
  persistReviewSubmission,
} from "@/lib/review/review-storage";
import type { BusinessChannels } from "@/lib/types/business";
import {
  sanitizeEmail,
  sanitizeMobile,
  sanitizePlainText,
} from "@/lib/security/input-sanitize";
import { useReviewI18n } from "@/components/review/review-i18n-provider";
import {
  getReviewSuggestionTexts,
  mapMobileValidationToReviewKey,
} from "@/lib/i18n/review-messages";
import { playReviewSubmitSuccessConfetti } from "@/lib/review/review-confetti";
import {
  clampReviewMobileNationalInput,
  optionalEmailValidationMessageKey,
  optionalNameValidationMessageKey,
  normalizeReviewEmailInput,
} from "@/lib/review/review-contact-validation";
import { useAiReviewSuggestions } from "@/components/review/use-ai-review-suggestions";
import { ReviewAiSuggestionSkeleton } from "@/components/review/review-ai-suggestion-skeleton";
import type { AiReviewLanguage } from "@/lib/ai/constants";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

const suggestionBtnClass = (selected: boolean) =>
  `w-full rounded-xl border px-4 py-3.5 text-left text-sm leading-snug transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out motion-reduce:transition-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:py-4 ${
    selected
      ? "border-[var(--review-primary)] bg-[color-mix(in_srgb,var(--review-bg)_82%,var(--review-primary)_12%)] shadow-[0_0_0_2px_var(--review-primary)]"
      : "border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] hover:border-[color-mix(in_srgb,var(--review-primary)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-primary)_6%)]"
  } text-[var(--review-fg)]`;

export type ReviewRatingPlaceholderProps = {
  businessId: string;
  googleReviewUrl: string;
  threshold: number;
  directRedirect: boolean;
  skipPreferredAutoRedirect?: boolean;
  allowLowRatingRedirect: boolean;
  channels: BusinessChannels | null;
  onRatingChange?: (rating: number) => void;
  /** Server flag: business + global AI allow POST /api/ai/generate-review */
  aiReviewGenerationEnabled?: boolean;
  /** Language for AI API (business AI setting); must match server. */
  aiGenerateLanguage?: AiReviewLanguage;
  /** Expected AI suggestion count from plan (1 / 3 / 5). */
  aiSuggestionCount?: number;
};

type FlowView = "form" | "return" | "thanks_internal";

type ApiErr = { error?: string; fields?: Record<string, string> };

export function ReviewRatingPlaceholder({
  businessId,
  googleReviewUrl,
  threshold,
  directRedirect,
  skipPreferredAutoRedirect = false,
  allowLowRatingRedirect,
  channels,
  onRatingChange,
  aiReviewGenerationEnabled = false,
  aiGenerateLanguage = "en",
  aiSuggestionCount = 3,
}: ReviewRatingPlaceholderProps) {
  const { locale, t } = useReviewI18n();
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [flow, setFlow] = useState<FlowView>("form");
  const [returnPhase, setReturnPhase] = useState<ReviewReturnPhase>("question");
  const [rating, setRating] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileCountryCode, setMobileCountryCode] = useState(DEFAULT_DIAL_CODE);
  const [mobileNumber, setMobileNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [clipboardWarning, setClipboardWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [fieldTouched, setFieldTouched] = useState({
    name: false,
    email: false,
    mobile: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [googleRedirectHold, setGoogleRedirectHold] = useState<{
    url: string;
    redirectAt: number;
  } | null>(null);
  const [redirectSecondsLeft, setRedirectSecondsLeft] = useState(0);
  const redirectNavStartedRef = useRef(false);

  useBodyScrollLock(Boolean(googleRedirectHold));

  const staticSuggestions = useMemo(
    () => (rating > 0 ? getReviewSuggestionTexts(locale, rating) : []),
    [locale, rating],
  );

  const aiSuggest = useAiReviewSuggestions({
    enabled: aiReviewGenerationEnabled,
    businessId,
    rating,
    apiLanguage: aiGenerateLanguage,
    expectedSuggestionCount: aiSuggestionCount,
  });

  const displayCardTexts = useMemo(() => {
    if (!aiReviewGenerationEnabled) return staticSuggestions;
    if (aiSuggest.phase === "success" && aiSuggest.suggestions.length > 0) {
      return aiSuggest.suggestions;
    }
    if (aiSuggest.useStaticFallback) return staticSuggestions;
    return [];
  }, [
    aiReviewGenerationEnabled,
    aiSuggest.phase,
    aiSuggest.suggestions,
    aiSuggest.useStaticFallback,
    staticSuggestions,
  ]);

  const skeletonRows = Math.min(5, Math.max(1, Math.floor(aiSuggestionCount)));
  const showAiSuggestionSkeleton =
    aiReviewGenerationEnabled &&
    rating > 0 &&
    (aiSuggest.phase === "debouncing" || aiSuggest.phase === "fetching");

  const effectiveSelectedIndex =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < displayCardTexts.length
      ? selectedIndex
      : null;

  const showingAiCards =
    aiReviewGenerationEnabled &&
    aiSuggest.phase === "success" &&
    aiSuggest.suggestions.length > 0;

  const lastShowingAiRef = useRef(false);
  useEffect(() => {
    if (showingAiCards && !lastShowingAiRef.current) {
      setSelectedIndex(null);
    }
    lastShowingAiRef.current = showingAiCards;
  }, [showingAiCards]);

  const optionsTitle = aiReviewGenerationEnabled
    ? t("rating.aiSuggestedTitle")
    : t("rating.suggestedWording");
  const optionsHint = aiReviewGenerationEnabled
    ? t("rating.aiSuggestedHint")
    : t("rating.suggestedHint");

  const aiNotice = useMemo(() => {
    if (!aiReviewGenerationEnabled) return null;
    if (aiSuggest.phase !== "error") return null;
    if (aiSuggest.errorCode === "rate_limited") return t("rating.aiRateLimited");
    if (aiSuggest.errorCode === "ai_unavailable" || aiSuggest.errorCode === "invalid_business") {
      return t("rating.aiUnavailable");
    }
    if (aiSuggest.errorCode === "empty") return t("rating.aiEmptyFallback");
    return t("rating.aiLoadFailed");
  }, [aiReviewGenerationEnabled, aiSuggest.errorCode, aiSuggest.phase, t]);

  const aiLoadingBlock =
    aiReviewGenerationEnabled &&
    rating > 0 &&
    (aiSuggest.phase === "debouncing" || aiSuggest.phase === "fetching");

  useEffect(() => {
    aiReviewDebug("ui:render", {
      aiReviewGenerationEnabled,
      rating,
      phase: aiSuggest.phase,
      suggestionCount: aiSuggest.suggestions.length,
      displayCardCount: displayCardTexts.length,
      showingAiCards,
      aiLoadingBlock,
      aiNotice: aiNotice ?? null,
      errorCode: aiSuggest.errorCode,
      wasCached: aiSuggest.wasCached,
      aiSuggestionCount,
    });
  }, [
    aiReviewGenerationEnabled,
    rating,
    aiSuggest.phase,
    aiSuggest.suggestions.length,
    displayCardTexts.length,
    showingAiCards,
    aiLoadingBlock,
    aiNotice,
    aiSuggest.errorCode,
    aiSuggest.wasCached,
    aiSuggestionCount,
  ]);

  useEffect(() => {
    if (!googleRedirectHold) {
      redirectNavStartedRef.current = false;
      const clearId = window.setTimeout(() => setRedirectSecondsLeft(0), 0);
      return () => window.clearTimeout(clearId);
    }
    redirectNavStartedRef.current = false;
    const hold = googleRedirectHold;
    const tick = () => {
      setRedirectSecondsLeft(
        Math.max(0, Math.ceil((hold.redirectAt - Date.now()) / 1000)),
      );
      if (redirectNavStartedRef.current) return;
      if (Date.now() >= hold.redirectAt) {
        redirectNavStartedRef.current = true;
        try {
          window.location.href = hold.url;
        } catch {
          redirectNavStartedRef.current = false;
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [googleRedirectHold]);
  const trimmedReview = reviewText.trim();
  const mobileLocalDigits = useMemo(
    () => sanitizePhoneLocalInput(mobileNumber),
    [mobileNumber],
  );
  const normalizedMobile = useMemo(
    () =>
      mobileLocalDigits.length > 0
        ? joinDialAndLocal(mobileCountryCode, mobileNumber)
        : "",
    [mobileCountryCode, mobileNumber, mobileLocalDigits],
  );
  const mobileError = useMemo(() => {
    if (mobileLocalDigits.length === 0) return null;
    return validateInternationalPhone(normalizedMobile);
  }, [mobileLocalDigits.length, normalizedMobile]);
  const mobileErrorDisplay = useMemo(() => {
    if (!mobileError) return null;
    const key = mapMobileValidationToReviewKey(mobileError);
    return key ? t(key) : mobileError;
  }, [mobileError, t]);

  const nameErrKey = useMemo(() => optionalNameValidationMessageKey(name), [name]);
  const emailErrKey = useMemo(() => optionalEmailValidationMessageKey(email), [email]);

  const showNameError = (fieldTouched.name || submitAttempted) && nameErrKey;
  const showEmailError = (fieldTouched.email || submitAttempted) && emailErrKey;
  const showMobileError =
    (fieldTouched.mobile || submitAttempted) && mobileErrorDisplay;

  const googleRedirectAfterSubmit = useMemo(() => {
    const { shouldRedirect, googleUrl } = resolveGoogleReviewSubmitRedirect({
      rating,
      threshold,
      allowLowRatingRedirect,
      googleReviewUrl,
    });
    return Boolean(
      shouldRedirect && googleUrl && isSafeHttpUrl(googleUrl.trim()),
    );
  }, [allowLowRatingRedirect, googleReviewUrl, rating, threshold]);

  const submitButtonEnabled =
    flow === "form" &&
    rating > 0 &&
    trimmedReview.length > 0 &&
    !submitted &&
    !isSubmitting;

  const handleRatingChange = useCallback(
    (next: number) => {
      aiReviewDebug("ui:rating", {
        next,
        aiReviewGenerationEnabled,
        aiSuggestionCount,
      });
      setSelectedIndex(null);
      setReviewText("");
      setSubmitted(false);
      setClipboardWarning(false);
      setSubmitError(null);
      setSubmitAttempted(false);
      setFieldTouched({ name: false, email: false, mobile: false });
      setGoogleRedirectHold(null);
      setRating(next);
      onRatingChange?.(next);
    },
    [onRatingChange],
  );

  const hasRating = rating > 0;
  const preferredPublic = useMemo(
    () => getPreferredPublicUrl({ googleReviewUrl, channels, directRedirect }),
    [channels, directRedirect, googleReviewUrl],
  );

  const outboundScanType = useMemo(
    () => reviewSourceLabelToScanType(preferredPublic.sourceLabel),
    [preferredPublic.sourceLabel],
  );

  /** Post–review-submit outbound: always `google_url` + scan type `google` (not social “preferred”). */
  const trackedGoogleReviewUrl = useMemo(() => {
    const g = googleReviewUrl.trim();
    if (!businessId || !isSafeHttpUrl(g)) return "";
    return buildTrackedScanOutUrl(businessId, "google", g);
  }, [businessId, googleReviewUrl]);

  const reviewRedirectDebug =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_REVIEW_REDIRECT_DEBUG === "1";

  const hasAutoRedirected = useRef(false);

  useEffect(() => {
    const dest = preferredPublic.url?.trim() ?? "";
    if (
      !directRedirect ||
      skipPreferredAutoRedirect ||
      hasAutoRedirected.current ||
      !dest ||
      !isSafeHttpUrl(dest) ||
      !businessId
    )
      return;
    hasAutoRedirected.current = true;
    window.location.replace(
      buildTrackedScanOutUrl(businessId, outboundScanType, dest),
    );
  }, [
    businessId,
    directRedirect,
    outboundScanType,
    preferredPublic.url,
    skipPreferredAutoRedirect,
  ]);

  useEffect(
    () => () => {
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current);
      }
    },
    [],
  );

  const showCopySuccessToast = useCallback(() => {
    setClipboardWarning(false);
    if (copyToastTimerRef.current) {
      clearTimeout(copyToastTimerRef.current);
      copyToastTimerRef.current = null;
    }
    setCopyToastVisible(true);
    copyToastTimerRef.current = setTimeout(() => {
      setCopyToastVisible(false);
      copyToastTimerRef.current = null;
    }, 4500);
  }, []);

  const selectOption = useCallback(
    (index: number, text: string) => {
      if (submitted || flow !== "form" || isSubmitting) return;
      setSubmitError(null);
      setSelectedIndex(index);
      setReviewText(text);
      queueMicrotask(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(text.length, text.length);
      });
    },
    [flow, isSubmitting, submitted],
  );

  const handleSuggestionPick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (submitted || flow !== "form" || isSubmitting) return;
      const idx = Number.parseInt(e.currentTarget.dataset.idx ?? "", 10);
      if (!Number.isFinite(idx) || idx < 0) return;
      const text = displayCardTexts[idx];
      if (typeof text !== "string") return;
      selectOption(idx, text);
    },
    [displayCardTexts, flow, isSubmitting, selectOption, submitted],
  );

  const handleSubmit = useCallback(async () => {
    const text = reviewText.trim();
    setSubmitAttempted(true);

    if (submitted || flow !== "form") return;
    if (isSubmitting || submittingRef.current) return;

    if (rating <= 0 || text.length === 0) {
      setSubmitError(t("rating.errIncompleteReview"));
      queueMicrotask(() => {
        textareaRef.current?.focus();
      });
      return;
    }

    const nameKey = optionalNameValidationMessageKey(name);
    if (nameKey) {
      setSubmitError(null);
      queueMicrotask(() => {
        document.getElementById(`${id}-name`)?.focus();
      });
      return;
    }

    const emailKey = optionalEmailValidationMessageKey(email);
    if (emailKey) {
      setSubmitError(null);
      queueMicrotask(() => {
        document.getElementById(`${id}-email`)?.focus();
      });
      return;
    }

    if (mobileError) {
      setSubmitError(null);
      queueMicrotask(() => {
        document.getElementById(`${id}-mobile`)?.focus();
      });
      return;
    }

    submittingRef.current = true;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const trimmedName = name.trim();
      const normalizedEmail = normalizeReviewEmailInput(email);
      const safeReview = sanitizePlainText(text, 8000);
      const safeName = trimmedName ? sanitizePlainText(trimmedName, 200) : "";
      const safeEmail = normalizedEmail ? sanitizeEmail(normalizedEmail) : "";
      const safeMobile = normalizedMobile ? sanitizeMobile(normalizedMobile) : "";
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          rating,
          review_text: safeReview,
          name: safeName,
          email: safeEmail,
          mobile: safeMobile,
        }),
      });

      const raw = await res.text();
      let body: ApiErr | Record<string, unknown> = {};
      try {
        body = raw ? (JSON.parse(raw) as ApiErr) : {};
      } catch {
        body = {};
      }

      if (!res.ok) {
        const err = body as ApiErr;
        const fieldMsg = err.fields ? Object.values(err.fields).join(" ") : "";
        setSubmitError(
          [err.error, fieldMsg].filter(Boolean).join(" ") || t("rating.errGeneric"),
        );
      } else {
        persistReviewSubmission({ rating, review_text: safeReview });

        playReviewSubmitSuccessConfetti();

        setSubmitted(true);
        setClipboardWarning(false);

        const { shouldRedirect: canRedirectPublicly, googleUrl } =
          resolveGoogleReviewSubmitRedirect({
            rating,
            threshold,
            allowLowRatingRedirect,
            googleReviewUrl,
          });

        const willRedirect = Boolean(
          canRedirectPublicly &&
            googleUrl &&
            isSafeHttpUrl((googleUrl as string).trim()),
        );

        void navigator.clipboard.writeText(safeReview).then(() => {
          if (!willRedirect) showCopySuccessToast();
        }).catch(() => {
          setClipboardWarning(true);
          console.warn(
            "Clipboard unavailable; review text was not copied automatically.",
          );
        });

        if (!willRedirect) {
          if (reviewRedirectDebug) {
            console.info("[review-redirect]", {
              eligible: false,
              rating,
              threshold,
              allow_low_rating_redirect: allowLowRatingRedirect,
              finalUrl: googleUrl,
              redirectBlockedReason: !canRedirectPublicly
                ? "policy_or_invalid_url"
                : "no_google_url",
              currentRoute:
                typeof window !== "undefined" ? window.location.href : "",
              rewardModalOpen:
                typeof document !== "undefined"
                  ? document.body?.dataset?.reviewRewardModalOpen
                  : undefined,
              loadingState: { isSubmitting: false },
            });
          }
          setFlow("thanks_internal");
          return;
        }

        const trackedGoogle = buildTrackedScanOutUrl(
          businessId,
          "google",
          googleUrl as string,
        );

        const logRedirectContext = (extra: Record<string, unknown>) => {
          if (!reviewRedirectDebug) return;
          console.info("[review-redirect]", {
            eligible: true,
            rating,
            threshold,
            allow_low_rating_redirect: allowLowRatingRedirect,
            direct_redirect_business_flag: directRedirect,
            finalUrl: trackedGoogle,
            currentRoute:
              typeof window !== "undefined" ? window.location.href : "",
            rewardModalOpen:
              typeof document !== "undefined"
                ? document.body?.dataset?.reviewRewardModalOpen
                : undefined,
            delayedReviewModalOpen:
              typeof document !== "undefined"
                ? document.body?.dataset?.reviewModalOpen
                : undefined,
            loadingState: { isSubmitting: false },
            ...extra,
          });
        };

        logRedirectContext({
          redirectAllowed: true,
          phase: "before_delayed_navigation",
        });

        const delayMs = 3000 + Math.round(Math.random() * 2000);
        setGoogleRedirectHold({
          url: trackedGoogle,
          redirectAt: Date.now() + delayMs,
        });
      }
    } catch {
      setSubmitError(t("rating.errNetwork"));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    allowLowRatingRedirect,
    businessId,
    directRedirect,
    email,
    flow,
    googleReviewUrl,
    id,
    isSubmitting,
    mobileError,
    name,
    normalizedMobile,
    rating,
    reviewText,
    submitted,
    reviewRedirectDebug,
    showCopySuccessToast,
    t,
    threshold,
  ]);

  const inputErrorRing =
    " border-red-400/80 focus:border-red-500 focus:ring-[color-mix(in_srgb,red_35%,transparent)]";

  const handleReturnYes = useCallback(() => {
    persistGoogleReviewConfirmed();
    setReturnPhase("yes_success");
  }, []);

  const handleReturnDefer = useCallback(() => {
    setReturnPhase("open_google_prompt");
  }, []);

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_98%,var(--review-fg))] px-3 py-2.5 text-sm text-[var(--review-fg)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--review-muted)] focus:border-[var(--review-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--review-primary)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60";

  const selectClass =
    "mt-1.5 w-[100px] rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_98%,var(--review-fg))] px-3 py-2.5 text-sm text-[var(--review-fg)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--review-muted)] focus:border-[var(--review-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--review-primary)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60";

  const ratingStarsLabel =
    rating > 0 ? (rating === 1 ? t("rating.starOne") : t("rating.starsMany", { n: rating })) : t("rating.dash");

  const copySuccessToast =
    copyToastVisible ? (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      >
        <div className="max-w-md rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3 text-center shadow-lg">
          <p className="text-sm font-semibold text-[var(--review-fg)]">
            {t("rating.copyToastTitle")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--review-muted)]">
            {t("rating.copyToastBody")}
          </p>
        </div>
      </div>
    ) : null;

  if (flow === "thanks_internal") {
    return (
      <section
        className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
        aria-label={t("rating.thanksAria")}
      >
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--review-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_78%,var(--review-primary)_14%)] px-4 py-8 text-center sm:px-6 sm:py-10">
          <p className="text-base font-semibold text-[var(--review-fg)] sm:text-lg">
            {t("rating.thanksTitle")}
          </p>
          <p className="mt-2 text-sm text-[var(--review-muted)]">{t("rating.thanksBody")}</p>
        </div>
        {copySuccessToast}
      </section>
    );
  }

  if (flow === "return") {
    if (!trackedGoogleReviewUrl) {
      return (
        <section
          className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
          aria-label={t("rating.thanksAria")}
        >
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--review-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_78%,var(--review-primary)_14%)] px-4 py-8 text-center sm:px-6 sm:py-10">
            <p className="text-base font-semibold text-[var(--review-fg)] sm:text-lg">
              {t("rating.thanksTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--review-muted)]">
              {t("rating.thanksNoLinkBody")}
            </p>
          </div>
          {copySuccessToast}
        </section>
      );
    }

    return (
      <section
        className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
        aria-label={t("rating.returnAria")}
      >
        {(rating > 0 || reviewText.length > 0) && (
          <div className="mb-5 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-3 py-3 sm:px-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--review-muted)]">
              {t("rating.savedReview")}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--review-fg)]">{ratingStarsLabel}</p>
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-[var(--review-muted)]">
              {reviewText || t("rating.dash")}
            </p>
          </div>
        )}

        <ReviewGoogleReturnPanel
          phase={returnPhase}
          reviewUrl={trackedGoogleReviewUrl}
          reviewSourceLabel={t("googleReturn.reviewLinkBrand")}
          onYes={handleReturnYes}
          onNotYet={handleReturnDefer}
          onNo={handleReturnDefer}
        />

        {clipboardWarning && returnPhase === "question" ? (
          <p className="mt-4 text-center text-xs leading-relaxed text-[var(--review-muted)]">
            {t("rating.clipboardWarning")}
          </p>
        ) : null}
        {copySuccessToast}
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
      aria-labelledby="rating-heading"
      aria-busy={isSubmitting}
    >
      <div className="border-l-[3px] border-[var(--review-secondary)] pl-3 sm:pl-4">
        <h2
          id="rating-heading"
          className="text-sm font-semibold text-[var(--review-fg)] sm:text-base"
        >
          {t("rating.yourRating")}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--review-muted)]">
          {t("rating.tapStars")}
        </p>
      </div>
      <div className="mt-5 flex justify-center">
        <StarRating
          label={t("rating.starGroupLabel")}
          value={rating}
          onChange={handleRatingChange}
          disabled={submitted || isSubmitting}
        />
      </div>

      {!hasRating ? (
        <p className="mt-4 text-center text-xs leading-relaxed text-[var(--review-muted)]">
          {t("rating.chooseRating")}
        </p>
      ) : null}

      <div
        aria-hidden={!hasRating}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          hasRating
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id={`${id}-options-label`}
                  className="text-xs font-medium text-[var(--review-fg)] sm:text-sm"
                >
                  {optionsTitle}
                </h3>
                {showingAiCards && aiSuggest.wasCached ? (
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--review-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_88%,var(--review-primary)_10%)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--review-primary)]">
                    {t("rating.aiInstantBadge")}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-[var(--review-muted)]">{optionsHint}</p>
            </div>

            {aiNotice ? (
              <p
                role="status"
                className="rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] px-3 py-2.5 text-center text-[11px] leading-relaxed text-[var(--review-muted)] sm:text-xs"
              >
                {aiNotice}
              </p>
            ) : null}

            {showAiSuggestionSkeleton ? (
              <div
                className="min-h-[calc(var(--ai-skeleton-rows)*3.25rem)] space-y-2"
                style={
                  { "--ai-skeleton-rows": String(skeletonRows) } as CSSProperties
                }
                aria-busy="true"
                aria-live="polite"
              >
                <p className="text-xs font-medium text-[var(--review-fg)]">
                  {aiSuggest.phase === "debouncing"
                    ? t("rating.aiPreparing")
                    : t("rating.aiGenerating")}
                </p>
                {aiSuggest.phase === "fetching" && aiSuggest.showFetchSkeleton ? (
                  <p className="text-[11px] text-[var(--review-muted)]">
                    {t("rating.aiGeneratingSub")}
                  </p>
                ) : null}
                <ReviewAiSuggestionSkeleton rows={skeletonRows} />
              </div>
            ) : null}

            <ul
              className={`flex flex-col gap-3 ${showAiSuggestionSkeleton ? "hidden" : ""}`}
              role="list"
              aria-labelledby={`${id}-options-label`}
              aria-hidden={showAiSuggestionSkeleton || undefined}
            >
              {displayCardTexts.map((text, index) => {
                const selected = effectiveSelectedIndex === index;
                const cardKey = showingAiCards ? `ai-${rating}-${index}` : `st-${rating}-${index}`;
                return (
                  <li key={cardKey}>
                    <button
                      suppressHydrationWarning
                      type="button"
                      data-idx={String(index)}
                      aria-pressed={selected}
                      disabled={submitted || isSubmitting}
                      onClick={handleSuggestionPick}
                      className={suggestionBtnClass(selected)}
                    >
                      {text}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div>
              <label
                htmlFor={`${id}-review`}
                className="text-xs font-medium text-[var(--review-fg)] sm:text-sm"
              >
                {t("rating.yourReview")}
              </label>
              <textarea
                suppressHydrationWarning
                ref={textareaRef}
                id={`${id}-review`}
                value={reviewText}
                aria-required="true"
                onChange={(e) => {
                  const v = e.target.value;
                  setSubmitError(null);
                  setReviewText(v);
                  if (effectiveSelectedIndex !== null) {
                    const chosen = displayCardTexts[effectiveSelectedIndex];
                    if (chosen !== undefined && v !== chosen) {
                      setSelectedIndex(null);
                    }
                  }
                }}
                readOnly={submitted || isSubmitting}
                rows={4}
                placeholder={t("rating.reviewPlaceholder")}
                className="mt-2 w-full scroll-mt-4 resize-y rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_98%,var(--review-fg))] px-3 py-3 text-base leading-relaxed text-[var(--review-fg)] outline-none transition-[border-color,box-shadow,min-height] duration-200 read-only:cursor-default read-only:opacity-90 placeholder:text-[var(--review-muted)] focus:border-[var(--review-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--review-primary)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] p-4">
              <h3 className="text-xs font-medium text-[var(--review-fg)] sm:text-sm">
                {t("rating.yourDetails")}
              </h3>
              <div>
                <label
                  htmlFor={`${id}-name`}
                  className="text-xs font-medium text-[var(--review-muted)]"
                >
                  {t("rating.name")}
                </label>
                <input
                  suppressHydrationWarning
                  id={`${id}-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  aria-invalid={showNameError ? true : undefined}
                  aria-describedby={showNameError ? `${id}-name-err` : undefined}
                  maxLength={200}
                  value={name}
                  onChange={(e) => {
                    setSubmitError(null);
                    setName(e.target.value);
                  }}
                  onBlur={() => {
                    setFieldTouched((s) => ({ ...s, name: true }));
                    setName((n) => n.trim());
                  }}
                  disabled={submitted || isSubmitting}
                  placeholder={t("rating.namePlaceholder")}
                  className={`${inputClass}${showNameError ? inputErrorRing : ""}`}
                />
                {showNameError && nameErrKey ? (
                  <p id={`${id}-name-err`} className="mt-1 text-xs text-red-500">
                    {t(nameErrKey)}
                  </p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor={`${id}-email`}
                  className="text-xs font-medium text-[var(--review-muted)]"
                >
                  {t("rating.email")}
                </label>
                <input
                  suppressHydrationWarning
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={showEmailError ? true : undefined}
                  aria-describedby={showEmailError ? `${id}-email-err` : undefined}
                  maxLength={320}
                  value={email}
                  onChange={(e) => {
                    setSubmitError(null);
                    setEmail(e.target.value);
                  }}
                  onBlur={() => {
                    setFieldTouched((s) => ({ ...s, email: true }));
                    setEmail((em) => normalizeReviewEmailInput(em));
                  }}
                  disabled={submitted || isSubmitting}
                  placeholder={t("rating.emailPlaceholder")}
                  className={`${inputClass}${showEmailError ? inputErrorRing : ""}`}
                />
                {showEmailError && emailErrKey ? (
                  <p id={`${id}-email-err`} className="mt-1 text-xs text-red-500">
                    {t(emailErrKey)}
                  </p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor={`${id}-mobile`}
                  className="text-xs font-medium text-[var(--review-muted)]"
                >
                  {t("rating.mobile")}
                </label>
                <div className="mt-1.5 flex min-w-0 flex-col gap-2 sm:flex-row">
                  <select
                    suppressHydrationWarning
                    id={`${id}-mobile-country`}
                    value={mobileCountryCode}
                    onChange={(e) => {
                      setSubmitError(null);
                      setMobileCountryCode(e.target.value);
                      setFieldTouched((s) => ({ ...s, mobile: true }));
                    }}
                    disabled={submitted || isSubmitting}
                    className={`${selectClass} w-full shrink-0 sm:w-[100px]`}
                  >
                    {COUNTRY_DIAL_CODES.map((c) => (
                      <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                        {`${c.code} ${c.dialCode}`}
                      </option>
                    ))}
                  </select>
                  <input
                    suppressHydrationWarning
                    id={`${id}-mobile`}
                    name="mobile"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    aria-invalid={showMobileError ? true : undefined}
                    aria-describedby={showMobileError ? `${id}-mobile-err` : undefined}
                    maxLength={15}
                    value={mobileNumber}
                    onChange={(e) => {
                      setSubmitError(null);
                      setMobileNumber(clampReviewMobileNationalInput(e.target.value));
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text");
                      setSubmitError(null);
                      setMobileNumber(clampReviewMobileNationalInput(pasted));
                    }}
                    onBlur={() => {
                      setFieldTouched((s) => ({ ...s, mobile: true }));
                    }}
                    disabled={submitted || isSubmitting}
                    className={`${inputClass} min-w-0 flex-1${showMobileError ? inputErrorRing : ""}`}
                    placeholder={t("rating.mobilePlaceholder")}
                  />
                </div>
                {showMobileError ? (
                  <p id={`${id}-mobile-err`} className="mt-1 text-xs text-red-500">
                    {mobileErrorDisplay}
                  </p>
                ) : null}
              </div>
            </div>

            {googleRedirectAfterSubmit && hasRating && !submitted ? (
              <p
                className="rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-3 py-2.5 text-center text-[11px] leading-relaxed text-[var(--review-muted)] sm:text-xs"
                role="note"
              >
                {t("rating.googleRedirectHint")}
              </p>
            ) : null}

            {submitError ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-center text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
              >
                {submitError}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!submitButtonEnabled}
              onClick={() => void handleSubmit()}
              className="flex w-full min-h-[3rem] items-center justify-center rounded-xl bg-[var(--review-primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-[transform,opacity,box-shadow,filter] duration-200 ease-out hover:brightness-110 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 motion-reduce:active:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  {t("rating.submitting")}
                </span>
              ) : (
                t("rating.submit")
              )}
            </button>
          </div>
        </div>
      </div>

      {googleRedirectHold ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto overscroll-contain bg-black/45 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 sm:items-center sm:pb-8"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${id}-redirect-title`}
        >
          <div className="w-full max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] p-5 shadow-2xl">
            <p
              id={`${id}-redirect-title`}
              className="text-center text-base font-semibold text-[var(--review-fg)]"
            >
              {t("rating.copyToastTitle")}
            </p>
            <p className="mt-2 text-center text-sm leading-relaxed text-[var(--review-muted)]">
              {t("rating.googleRedirectHint")}
            </p>
            <p className="mt-2 text-center text-xs text-[var(--review-muted)]">
              {t("rating.postSubmitRedirectNote")}
            </p>
            <p className="mt-4 text-center text-sm font-semibold text-[var(--review-fg)]">
              {t("rating.redirectCountdown", { seconds: redirectSecondsLeft })}
            </p>
            {clipboardWarning ? (
              <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-300">
                {t("rating.clipboardWarning")}
              </p>
            ) : null}
            <a
              href={googleRedirectHold.url}
              className="mt-4 block text-center text-sm font-medium text-[var(--review-primary)] underline underline-offset-2"
            >
              {t("rating.redirectOpenManually")}
            </a>
          </div>
        </div>
      ) : null}

      {copySuccessToast}
    </section>
  );
}
