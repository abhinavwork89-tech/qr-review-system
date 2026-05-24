"use client";

import { useCallback, useRef } from "react";
import {
  clearReviewSessionClientState,
  scheduleReviewSessionExit,
} from "@/lib/review/review-session-cleanup";

const EXIT_DELAY_MS = 5000;

/**
 * Schedules post-session redirect + scoped storage cleanup after reward/review completion.
 * Does not register global pagehide/beforeunload handlers (avoids clearing state during
 * unrelated navigation while admin session cookie must stay intact).
 */
export function useReviewSessionExit(businessId: string) {
  const cancelExitRef = useRef<(() => void) | null>(null);

  const cancelScheduledExit = useCallback(() => {
    cancelExitRef.current?.();
    cancelExitRef.current = null;
  }, []);

  const scheduleExit = useCallback(() => {
    cancelScheduledExit();
    cancelExitRef.current = scheduleReviewSessionExit(businessId, EXIT_DELAY_MS);
  }, [businessId, cancelScheduledExit]);

  const clearSessionNow = useCallback(() => {
    clearReviewSessionClientState(businessId);
  }, [businessId]);

  return { scheduleExit, cancelScheduledExit, clearSessionNow };
}
