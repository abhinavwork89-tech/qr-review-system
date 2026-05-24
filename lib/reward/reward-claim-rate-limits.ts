/** Public reward claim — tuned for QR/mobile (double-tap, retries), still anti-abuse. */

/** Per-IP ceiling across all businesses/kinds on this instance. */
export const REWARD_CLAIM_IP_MAX = 120;
export const REWARD_CLAIM_IP_WINDOW_MS = 10 * 60_000;

/**
 * Per IP + business + kind — allows rapid legitimate play/retries (~50/min).
 * Separate keys for spin vs scratch.
 */
export const REWARD_CLAIM_BURST_MAX = 50;
export const REWARD_CLAIM_BURST_WINDOW_MS = 60_000;
