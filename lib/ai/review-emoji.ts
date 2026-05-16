/** Occasional, rating-aware emoji for review lines (fallback + post-process). */

type StarRating = 1 | 2 | 3 | 4 | 5;

function clampRating(rating: number): StarRating {
  const r = Math.round(rating);
  if (r <= 1) return 1;
  if (r >= 5) return 5;
  return r as StarRating;
}

const BY_RATING: Record<StarRating, string[]> = {
  1: ["😕", "😞"],
  2: ["😕", "😐"],
  3: ["🙂", "👍"],
  4: ["😊", "👍"],
  5: ["😊", "✨", "👍", "🙌"],
};

/** ~35% of lines get one trailing emoji; never duplicates if already present. */
export function maybeAppendReviewEmoji(
  line: string,
  rating: number,
  seed: number,
): string {
  const s = line.trim();
  if (!s) return s;
  if ((seed * 17 + rating * 3) % 10 >= 7) return s;
  const r = clampRating(rating);
  const pool = BY_RATING[r];
  const emoji = pool[(seed + r) % pool.length]!;
  if (s.includes(emoji)) return s;
  if (/\p{Extended_Pictographic}/u.test(s)) return s;
  return `${s} ${emoji}`;
}
