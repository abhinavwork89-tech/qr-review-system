-- Follow-up stability: UTC defaults on timestamps + composite indexes for admin list filters.
-- Additive only; no data deletion. Runs after 20260509130000_schema_stability_businesses_reviews.sql.

-- ---------------------------------------------------------------------------
-- Timestamp defaults (UTC) for new rows
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_settings
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.app_settings
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.business_types
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.business_types
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.businesses
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.businesses
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.reviews
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.reviews
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.scan_logs
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

-- ---------------------------------------------------------------------------
-- Null-safe backfill (existing rows only)
-- ---------------------------------------------------------------------------
UPDATE public.business_types
SET created_at = COALESCE(created_at, updated_at, timezone('utc', now()))
WHERE created_at IS NULL;

UPDATE public.business_types
SET updated_at = COALESCE(updated_at, created_at, timezone('utc', now()))
WHERE updated_at IS NULL;

-- ---------------------------------------------------------------------------
-- List / filter indexes (admin businesses page: plan_type, business_type, status)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_businesses_business_type_status
  ON public.businesses (business_type, status);

CREATE INDEX IF NOT EXISTS idx_businesses_status_plan_type
  ON public.businesses (status, plan_type);
