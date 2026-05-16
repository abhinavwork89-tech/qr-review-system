-- Phase 1: AI-assisted review infrastructure (global + business settings, usage log).

-- ---------------------------------------------------------------------------
-- app_settings: global AI controls (singleton row id = 1)
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS ai_enabled_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS ai_monthly_budget_limit numeric(14, 4) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS ai_daily_global_limit integer NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS ai_emergency_disable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_max_character_limit integer NOT NULL DEFAULT 220,
  ADD COLUMN IF NOT EXISTS ai_default_cooldown_seconds integer NOT NULL DEFAULT 45;

COMMENT ON COLUMN public.app_settings.ai_monthly_budget_limit IS
  'Soft cap: estimated USD sum per calendar month (operator-defined; not OpenAI billing).';

UPDATE public.app_settings
SET
  ai_enabled_global = COALESCE(ai_enabled_global, false),
  ai_model = COALESCE(NULLIF(trim(ai_model), ''), 'gpt-4.1-mini'),
  ai_monthly_budget_limit = COALESCE(ai_monthly_budget_limit, 500),
  ai_daily_global_limit = COALESCE(ai_daily_global_limit, 10000),
  ai_emergency_disable = COALESCE(ai_emergency_disable, false),
  ai_max_character_limit = COALESCE(ai_max_character_limit, 220),
  ai_default_cooldown_seconds = COALESCE(ai_default_cooldown_seconds, 45)
WHERE id = 1;

-- ---------------------------------------------------------------------------
-- businesses: per-tenant AI preferences
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_review_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS ai_daily_limit integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ai_suggestions_count smallint NULL;

COMMENT ON COLUMN public.businesses.ai_suggestions_count IS
  'When NULL, effective count follows plan (free=1, pro=3, pro_plus=5).';

UPDATE public.businesses
SET
  ai_review_language = CASE
    WHEN lower(trim(ai_review_language)) IN ('en', 'hi', 'hinglish') THEN lower(trim(ai_review_language))
    ELSE 'en'
  END
WHERE ai_review_language IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ai_review_generations: usage / audit (no raw prompts in phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_review_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  language text NOT NULL DEFAULT 'en',
  suggestions_count smallint NOT NULL DEFAULT 1,
  estimated_cost numeric(14, 8) NOT NULL DEFAULT 0,
  model_used text NOT NULL DEFAULT 'gpt-4.1-mini',
  generation_status text NOT NULL DEFAULT 'pending',
  ip_address text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_review_generations_rating_chk CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT ai_review_generations_status_chk CHECK (
    generation_status IN ('pending', 'completed', 'failed', 'blocked')
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_review_generations_business_id
  ON public.ai_review_generations (business_id);

CREATE INDEX IF NOT EXISTS idx_ai_review_generations_created_at
  ON public.ai_review_generations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_review_generations_status
  ON public.ai_review_generations (generation_status);

CREATE INDEX IF NOT EXISTS idx_ai_review_generations_business_created
  ON public.ai_review_generations (business_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ai_top_businesses_by_generations(row_limit integer)
RETURNS TABLE (business_id uuid, generation_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT g.business_id, count(*)::bigint AS generation_count
  FROM public.ai_review_generations g
  GROUP BY g.business_id
  ORDER BY generation_count DESC
  LIMIT greatest(1, least(coalesce(row_limit, 10), 100));
$$;
