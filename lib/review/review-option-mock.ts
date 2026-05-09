const FIVE_STAR = [
  "Amazing experience overall. Everything was smooth and professional.",
  "Really happy with the service. Highly recommended!",
  "Great experience, will definitely come again.",
] as const;

const THREE_FOUR_STAR = [
  "Good experience overall. Service was satisfactory.",
  "Decent service, could be slightly improved.",
  "Nice experience, staff was helpful.",
] as const;

const ONE_TWO_STAR = [
  "Service needs improvement. Not fully satisfied.",
  "Average experience, expected better.",
  "There were some issues during my visit.",
] as const;

/** Returns three suggested review lines for the given 1–5 rating. */
export function getReviewOptionTexts(rating: number): string[] {
  if (rating >= 5) return [...FIVE_STAR];
  if (rating >= 3) return [...THREE_FOUR_STAR];
  if (rating >= 1) return [...ONE_TWO_STAR];
  return [];
}
