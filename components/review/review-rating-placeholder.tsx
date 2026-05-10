"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { StarRating } from "@/components/star-rating";
import {
  ReviewGoogleReturnPanel,
  type ReviewReturnPhase,
} from "@/components/review/review-google-return-panel";
import {
  getPreferredPublicUrl,
  isSafeHttpUrl,
  shouldAllowPublicRedirect,
} from "@/lib/review/business-config";
import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import { reviewSourceLabelToScanType } from "@/lib/scan/qr-types";
import { getReviewOptionTexts } from "@/lib/review/review-option-mock";
import {
  persistGoogleReviewConfirmed,
  persistReviewSubmission,
} from "@/lib/review/review-storage";
import type { BusinessChannels } from "@/lib/types/business";

export type ReviewRatingPlaceholderProps = {
  businessId: string;
  googleReviewUrl: string;
  threshold: number;
  directRedirect: boolean;
  allowLowRatingRedirect: boolean;
  channels: BusinessChannels | null;
  /** Fires when the user selects 1–5 stars (after each change). */
  onRatingChange?: (rating: number) => void;
};

type FlowView = "form" | "return" | "thanks_internal";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type ApiErr = { error?: string; fields?: Record<string, string> };

export function ReviewRatingPlaceholder({
  businessId,
  googleReviewUrl,
  threshold,
  directRedirect,
  allowLowRatingRedirect,
  channels,
  onRatingChange,
}: ReviewRatingPlaceholderProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [flow, setFlow] = useState<FlowView>("form");
  const [returnPhase, setReturnPhase] = useState<ReviewReturnPhase>("question");
  const [rating, setRating] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [clipboardWarning, setClipboardWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const options = rating > 0 ? getReviewOptionTexts(rating) : [];
  const trimmedReview = reviewText.trim();
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMobile = mobile.trim();

  const canSubmit =
    flow === "form" &&
    rating > 0 &&
    trimmedReview.length > 0 &&
    trimmedName.length > 0 &&
    trimmedEmail.length > 0 &&
    looksLikeEmail(trimmedEmail) &&
    trimmedMobile.length > 0 &&
    !submitted &&
    !isSubmitting;

  const handleRatingChange = useCallback(
    (next: number) => {
      setSelectedIndex(null);
      setReviewText("");
      setSubmitted(false);
      setClipboardWarning(false);
      setSubmitError(null);
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
  const safeReturnUrl = useMemo(() => {
    const primary = preferredPublic.url && isSafeHttpUrl(preferredPublic.url)
      ? preferredPublic.url.trim()
      : "";
    if (primary) return primary;
    return isSafeHttpUrl(googleReviewUrl) ? googleReviewUrl.trim() : "";
  }, [googleReviewUrl, preferredPublic.url]);

  const outboundScanType = useMemo(
    () => reviewSourceLabelToScanType(preferredPublic.sourceLabel),
    [preferredPublic.sourceLabel],
  );

  const trackedSafeReturnUrl = useMemo(() => {
    if (!safeReturnUrl || !businessId) return safeReturnUrl;
    return buildTrackedScanOutUrl(businessId, outboundScanType, safeReturnUrl);
  }, [businessId, outboundScanType, safeReturnUrl]);

  const hasAutoRedirected = useRef(false);

  useEffect(() => {
    const dest = preferredPublic.url?.trim() ?? "";
    if (
      !directRedirect ||
      hasAutoRedirected.current ||
      !dest ||
      !isSafeHttpUrl(dest) ||
      !businessId
    )
      return;
    hasAutoRedirected.current = true;
    window.location.replace(
      buildTrackedScanOutUrl(
        businessId,
        outboundScanType,
        dest,
      ),
    );
  }, [businessId, directRedirect, outboundScanType, preferredPublic.url]);

  const selectOption = useCallback(
    (index: number, text: string) => {
      if (submitted || flow !== "form" || isSubmitting) return;
      setSelectedIndex(index);
      setReviewText(text);
      queueMicrotask(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(text.length, text.length);
      });
    },
    [flow, isSubmitting, submitted],
  );

  const handleSubmit = useCallback(async () => {
    const text = reviewText.trim();

    const canProceed =
      !submitted &&
      flow === "form" &&
      !isSubmitting &&
      !submittingRef.current &&
      rating > 0 &&
      text.length > 0;

    const hasValidContact =
      !!trimmedName &&
      !!trimmedEmail &&
      looksLikeEmail(trimmedEmail) &&
      !!trimmedMobile;

    if (!canProceed) {
      if (!rating || !text.length) {
        setSubmitError("Please complete the review details.");
      }
    } else if (!hasValidContact) {
      setSubmitError("Please complete your contact details.");
    } else {
      submittingRef.current = true;
      setSubmitError(null);
      setIsSubmitting(true);

      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: businessId,
            rating,
            review_text: text,
            name: trimmedName,
            email: trimmedEmail.toLowerCase(),
            mobile: trimmedMobile,
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
          const fieldMsg = err.fields
            ? Object.values(err.fields).join(" ")
            : "";
          setSubmitError(
            [err.error, fieldMsg].filter(Boolean).join(" ") ||
              "Something went wrong. Please try again.",
          );
        } else {
          persistReviewSubmission({ rating, review_text: text });

          setSubmitted(true);
          setClipboardWarning(false);

          try {
            await navigator.clipboard.writeText(text);
          } catch {
            setClipboardWarning(true);
            console.warn(
              "Clipboard unavailable; review text was not copied automatically.",
            );
          }

          const canRedirectPublicly = shouldAllowPublicRedirect(
            rating,
            threshold,
            allowLowRatingRedirect,
          );

          const redirectTarget =
            preferredPublic.url && isSafeHttpUrl(preferredPublic.url)
              ? preferredPublic.url.trim()
              : isSafeHttpUrl(googleReviewUrl)
                ? googleReviewUrl.trim()
                : "";

          if (!canRedirectPublicly || !redirectTarget) {
            setFlow("thanks_internal");
            return;
          }

          if (directRedirect) {
            window.location.replace(
              buildTrackedScanOutUrl(
                businessId,
                outboundScanType,
                redirectTarget,
              ),
            );
            return;
          }

          setFlow("return");
          setReturnPhase("question");
        }
      } catch {
        setSubmitError("Network error. Check your connection and try again.");
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }, [
    allowLowRatingRedirect,
    businessId,
    outboundScanType,
    directRedirect,
    flow,
    isSubmitting,
    preferredPublic.url,
    rating,
    reviewText,
    submitted,
    threshold,
    trimmedEmail,
    trimmedMobile,
    trimmedName,
  ]);

  const handleReturnYes = useCallback(() => {
    persistGoogleReviewConfirmed();
    setReturnPhase("yes_success");
  }, []);

  const handleReturnDefer = useCallback(() => {
    setReturnPhase("open_google_prompt");
  }, []);

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_98%,var(--review-fg))] px-3 py-2.5 text-sm text-[var(--review-fg)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--review-muted)] focus:border-[var(--review-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--review-primary)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60";

  if (flow === "thanks_internal") {
    return (
      <section
        className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
        aria-label="Thank you"
      >
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--review-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_78%,var(--review-primary)_14%)] px-4 py-8 text-center sm:px-6 sm:py-10">
          <p className="text-base font-semibold text-[var(--review-fg)] sm:text-lg">
            Thank you for your feedback
          </p>
          <p className="mt-2 text-sm text-[var(--review-muted)]">
            Your review has been saved. It helps the business improve.
          </p>
        </div>
      </section>
    );
  }

  if (flow === "return") {
    if (!safeReturnUrl) {
      return (
        <section
          className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
          aria-label="Thank you"
        >
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--review-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_78%,var(--review-primary)_14%)] px-4 py-8 text-center sm:px-6 sm:py-10">
            <p className="text-base font-semibold text-[var(--review-fg)] sm:text-lg">
              Thank you for your feedback
            </p>
            <p className="mt-2 text-sm text-[var(--review-muted)]">
              Your review has been saved. An external review link is not
              configured for this business.
            </p>
          </div>
        </section>
      );
    }

    return (
      <section
        className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
        aria-label="Google review follow-up"
      >
        {(rating > 0 || reviewText.length > 0) && (
          <div className="mb-5 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-3 py-3 sm:px-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--review-muted)]">
              Saved review
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--review-fg)]">
              {rating > 0 ? `${rating} star${rating === 1 ? "" : "s"}` : "—"}
            </p>
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-[var(--review-muted)]">
              {reviewText || "—"}
            </p>
          </div>
        )}

        <ReviewGoogleReturnPanel
          phase={returnPhase}
          reviewUrl={trackedSafeReturnUrl}
          reviewSourceLabel={preferredPublic.sourceLabel}
          onYes={handleReturnYes}
          onNotYet={handleReturnDefer}
          onNo={handleReturnDefer}
        />

        {clipboardWarning && returnPhase === "question" ? (
          <p className="mt-4 text-center text-xs leading-relaxed text-[var(--review-muted)]">
            We couldn&apos;t copy your text automatically. Use the saved review
            above if you need to paste on Google.
          </p>
        ) : null}
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
          Your rating
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--review-muted)]">
          Tap a star (1–5).
        </p>
      </div>
      <div className="mt-5 flex justify-center">
        <StarRating
          label="Your star rating"
          value={rating}
          onChange={handleRatingChange}
          disabled={submitted || isSubmitting}
        />
      </div>

      {!hasRating ? (
        <p className="mt-4 text-center text-xs leading-relaxed text-[var(--review-muted)]">
          Choose a rating to continue.
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
              <h3
                id={`${id}-options-label`}
                className="text-xs font-medium text-[var(--review-fg)] sm:text-sm"
              >
                Suggested wording
              </h3>
              <p className="mt-0.5 text-xs text-[var(--review-muted)]">
                Tap a card to insert text — you can edit it below.
              </p>
            </div>

            <ul
              className="flex flex-col gap-3"
              role="list"
              aria-labelledby={`${id}-options-label`}
            >
              {options.map((text, index) => {
                const selected = selectedIndex === index;
                return (
                  <li key={`${rating}-${index}`}>
                    <button
                      suppressHydrationWarning
                      type="button"
                      aria-pressed={selected}
                      disabled={submitted || isSubmitting}
                      onClick={() => selectOption(index, text)}
                      className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm leading-snug transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out motion-reduce:transition-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:py-4 ${
                        selected
                          ? "border-[var(--review-primary)] bg-[color-mix(in_srgb,var(--review-bg)_82%,var(--review-primary)_12%)] shadow-[0_0_0_2px_var(--review-primary)]"
                          : "border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] hover:border-[color-mix(in_srgb,var(--review-primary)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-primary)_6%)]"
                      } text-[var(--review-fg)]`}
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
                Your review
              </label>
              <textarea
                suppressHydrationWarning
                ref={textareaRef}
                id={`${id}-review`}
                value={reviewText}
                onChange={(e) => {
                  setSubmitError(null);
                  setReviewText(e.target.value);
                }}
                readOnly={submitted || isSubmitting}
                rows={4}
                placeholder="Select a suggestion above or write your own."
                className="mt-2 w-full resize-y rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_98%,var(--review-fg))] px-3 py-3 text-sm text-[var(--review-fg)] outline-none transition-[border-color,box-shadow] duration-200 read-only:cursor-default read-only:opacity-90 placeholder:text-[var(--review-muted)] focus:border-[var(--review-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--review-primary)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] p-4">
              <h3 className="text-xs font-medium text-[var(--review-fg)] sm:text-sm">
                Your details
              </h3>
              <div>
                <label
                  htmlFor={`${id}-name`}
                  className="text-xs font-medium text-[var(--review-muted)]"
                >
                  Name
                </label>
                <input
                  suppressHydrationWarning
                  id={`${id}-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setSubmitError(null);
                    setName(e.target.value);
                  }}
                  disabled={submitted || isSubmitting}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${id}-email`}
                  className="text-xs font-medium text-[var(--review-muted)]"
                >
                  Email
                </label>
                <input
                  suppressHydrationWarning
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setSubmitError(null);
                    setEmail(e.target.value);
                  }}
                  disabled={submitted || isSubmitting}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${id}-mobile`}
                  className="text-xs font-medium text-[var(--review-muted)]"
                >
                  Mobile
                </label>
                <input
                  suppressHydrationWarning
                  id={`${id}-mobile`}
                  name="mobile"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={mobile}
                  onChange={(e) => {
                    setSubmitError(null);
                    setMobile(e.target.value);
                  }}
                  disabled={submitted || isSubmitting}
                  className={inputClass}
                />
              </div>
            </div>

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
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className="flex w-full min-h-[3rem] items-center justify-center rounded-xl bg-[var(--review-primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-[transform,opacity,box-shadow,filter] duration-200 ease-out hover:brightness-110 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 motion-reduce:active:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Submitting…
                </span>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
