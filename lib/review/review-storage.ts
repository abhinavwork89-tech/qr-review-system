export const REVIEW_STORAGE_KEYS = {
  submitted: "review_submitted",
  snapshot: "review_flow_snapshot",
  googleConfirmed: "review_google_confirmed",
} as const;

export type ReviewFlowSnapshot = {
  rating: number;
  review_text: string;
};

export function readReviewSnapshot(): ReviewFlowSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REVIEW_STORAGE_KEYS.snapshot);
    if (!raw) return null;
    const data = JSON.parse(raw) as ReviewFlowSnapshot;
    if (
      typeof data.rating !== "number" ||
      typeof data.review_text !== "string"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function persistReviewSubmission(snapshot: ReviewFlowSnapshot) {
  localStorage.setItem(REVIEW_STORAGE_KEYS.submitted, "true");
  localStorage.setItem(REVIEW_STORAGE_KEYS.snapshot, JSON.stringify(snapshot));
  localStorage.removeItem(REVIEW_STORAGE_KEYS.googleConfirmed);
}

export function persistGoogleReviewConfirmed() {
  localStorage.setItem(REVIEW_STORAGE_KEYS.googleConfirmed, "true");
}

export function isReviewSubmittedFlag(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REVIEW_STORAGE_KEYS.submitted) === "true";
}

export function isGoogleReviewConfirmed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REVIEW_STORAGE_KEYS.googleConfirmed) === "true";
}
