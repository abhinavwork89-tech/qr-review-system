"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AiReviewLanguage } from "@/lib/ai/constants";
import { aiReviewDebug } from "@/lib/review/ai-review-debug";

export type AiReviewSuggestionsPhase = "idle" | "debouncing" | "fetching" | "success" | "error";

type GenerateResponse = {
  suggestions?: unknown;
  cached?: unknown;
  error?: string;
};

function parseBody(text: string): GenerateResponse {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as GenerateResponse;
  } catch {
    return {};
  }
}

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && e.name === "AbortError") return true;
  return false;
}

/** Jitter-free debounce for stable React Compiler / lint compliance. */
const AI_SUGGEST_DEBOUNCE_MS = 1000;

function capSuggestionList(list: string[], expected: number | undefined): string[] {
  if (typeof expected !== "number" || !Number.isFinite(expected) || expected <= 0) {
    return list;
  }
  const lim = Math.min(5, Math.max(1, Math.floor(expected)));
  return list.slice(0, lim);
}

export function useAiReviewSuggestions(input: {
  enabled: boolean;
  businessId: string;
  rating: number;
  /** Must match POST /api/ai/generate-review `language` (business AI preference). */
  apiLanguage: AiReviewLanguage;
  /** Plan-based expected count; caps extra model rows defensively. */
  expectedSuggestionCount: number;
}) {
  const [phase, setPhase] = useState<AiReviewSuggestionsPhase>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [wasCached, setWasCached] = useState(false);
  const [showFetchSkeleton, setShowFetchSkeleton] = useState(false);

  const requestGenRef = useRef(0);
  const skeletonTimerRef = useRef<number | null>(null);
  const lastRatingRef = useRef(input.rating);

  const aiActive = input.enabled && input.rating > 0;

  useLayoutEffect(() => {
    if (!input.enabled || input.rating <= 0) return;
    if (input.rating === lastRatingRef.current) return;
    lastRatingRef.current = input.rating;
    requestGenRef.current += 1;
    setPhase("debouncing");
    setSuggestions([]);
    setErrorCode(null);
    setWasCached(false);
    setShowFetchSkeleton(false);
  }, [input.enabled, input.rating]);

  useEffect(() => {
    aiReviewDebug("hook:input", {
      enabled: input.enabled,
      rating: input.rating,
      aiActive,
      businessId: input.businessId,
      apiLanguage: input.apiLanguage,
      expectedSuggestionCount: input.expectedSuggestionCount,
    });
  }, [
    input.enabled,
    input.rating,
    aiActive,
    input.businessId,
    input.apiLanguage,
    input.expectedSuggestionCount,
  ]);

  useEffect(() => {
    if (aiActive) return;
    const resetId = window.setTimeout(() => {
      setPhase("idle");
      setSuggestions([]);
      setErrorCode(null);
      setWasCached(false);
      setShowFetchSkeleton(false);
    }, 0);
    return () => window.clearTimeout(resetId);
  }, [aiActive]);

  useEffect(() => {
    if (!aiActive) {
      return;
    }

    const myGen = ++requestGenRef.current;
    const ac = new AbortController();

    const debounceMs = AI_SUGGEST_DEBOUNCE_MS;

    aiReviewDebug("fetch:scheduled", { myGen, debounceMs, rating: input.rating });

    const primeId = window.setTimeout(() => {
      if (requestGenRef.current !== myGen) return;
      aiReviewDebug("fetch:debouncing", { myGen, rating: input.rating });
      setPhase("debouncing");
      setSuggestions([]);
      setErrorCode(null);
      setWasCached(false);
      setShowFetchSkeleton(false);
    }, 0);

    const debounceTimer = window.setTimeout(() => {
      if (requestGenRef.current !== myGen) return;

      aiReviewDebug("fetch:start", { myGen, rating: input.rating });
      setPhase("fetching");
      skeletonTimerRef.current = window.setTimeout(() => {
        if (requestGenRef.current === myGen) setShowFetchSkeleton(true);
      }, 320);

      void (async () => {
        try {
          const res = await fetch("/api/ai/generate-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: input.businessId,
              rating: input.rating,
              language: input.apiLanguage,
            }),
            signal: ac.signal,
          });

          const raw = await res.text();
          const body = parseBody(raw);

          if (requestGenRef.current !== myGen) return;

          if (skeletonTimerRef.current !== null) {
            window.clearTimeout(skeletonTimerRef.current);
            skeletonTimerRef.current = null;
          }
          setShowFetchSkeleton(false);

          if (ac.signal.aborted) return;

          aiReviewDebug("fetch:response", {
            myGen,
            status: res.status,
            ok: res.ok,
            cached: body.cached === true,
            suggestionCount: Array.isArray(body.suggestions) ? body.suggestions.length : 0,
            error: body.error ?? null,
          });

          if (!res.ok) {
            const code =
              typeof body.error === "string" && body.error.trim()
                ? body.error.trim()
                : res.status === 429
                  ? "rate_limited"
                  : res.status === 403
                    ? "ai_unavailable"
                    : "request_failed";
            setPhase("error");
            setErrorCode(code);
            setSuggestions([]);
            return;
          }

          const rawList = Array.isArray(body.suggestions)
            ? (body.suggestions as unknown[]).filter((x): x is string => typeof x === "string")
            : [];
          const list = capSuggestionList(rawList, input.expectedSuggestionCount);

          setWasCached(body.cached === true);
          setSuggestions(list);
          if (list.length === 0) {
            setPhase("error");
            setErrorCode("empty");
          } else {
            setPhase("success");
            setErrorCode(null);
            aiReviewDebug("fetch:success", { myGen, count: list.length, wasCached: body.cached === true });
          }
        } catch (e) {
          if (ac.signal.aborted || isAbortError(e)) {
            aiReviewDebug("fetch:aborted", { myGen, name: e instanceof Error ? e.name : "unknown" });
            return;
          }
          if (requestGenRef.current !== myGen) return;
          if (skeletonTimerRef.current !== null) {
            window.clearTimeout(skeletonTimerRef.current);
            skeletonTimerRef.current = null;
          }
          setShowFetchSkeleton(false);
          setPhase("error");
          setErrorCode("network");
          setSuggestions([]);
        }
      })();
    }, debounceMs);

    return () => {
      aiReviewDebug("fetch:cleanup", { myGen, rating: input.rating });
      ac.abort();
      window.clearTimeout(primeId);
      window.clearTimeout(debounceTimer);
      if (skeletonTimerRef.current !== null) {
        window.clearTimeout(skeletonTimerRef.current);
        skeletonTimerRef.current = null;
      }
    };
  }, [
    aiActive,
    input.businessId,
    input.rating,
    input.apiLanguage,
    input.expectedSuggestionCount,
  ]);

  const useStaticFallback =
    !input.enabled ||
    phase === "error" ||
    (phase === "success" && suggestions.length === 0);

  return {
    phase,
    suggestions,
    errorCode,
    wasCached,
    showFetchSkeleton,
    useStaticFallback,
  };
}
