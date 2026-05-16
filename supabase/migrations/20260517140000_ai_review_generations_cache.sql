-- Track cache-served generations for analytics / cost attribution.
ALTER TABLE public.ai_review_generations
  ADD COLUMN IF NOT EXISTS from_cache boolean NOT NULL DEFAULT false;
