-- Schema stability: align DB with application usage (additive only; no data deletion).
-- Targets: businesses, reviews, app_settings, business_types; plus scan_logs (POST /api/scan).
--
-- Column mapping (app logic unchanged):
--   Branding: businesses.brand_name, logo_url, primary_color, secondary_color, theme_*; app_settings.branding_logo_url
--   Uploads / media: businesses.logo_url, banner_urls (jsonb), resource_urls (jsonb); legacy banner_url (read-only fallback)
--   Reward system: businesses.channels jsonb — spin_enabled, scratch_enabled, reward_config (+ social links)
--   QR / review entry: businesses.slug (public /r/[slug]), resource_urls (hosted QR assets), threshold, google_url, redirects

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

UPDATE public.app_settings
SET created_at = COALESCE(created_at, updated_at, timezone('utc', now()))
WHERE id = 1;

-- ---------------------------------------------------------------------------
-- business_types (indexes; base table from prior migration)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_business_types_name ON public.business_types (name);

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS brand_name text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS primary_color text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS secondary_color text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS plan_type text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS google_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS threshold integer;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS direct_redirect boolean DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS allow_low_rating_redirect boolean DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS channels jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS banner_urls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS resource_urls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS theme_primary text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS theme_background text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS theme_foreground text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS customer_care_number text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

UPDATE public.businesses
SET created_at = timezone('utc', now())
WHERE created_at IS NULL;

UPDATE public.businesses
SET updated_at = COALESCE(updated_at, created_at, timezone('utc', now()))
WHERE updated_at IS NULL;

UPDATE public.businesses
SET is_active = COALESCE(is_active, true)
WHERE is_active IS NULL;

UPDATE public.businesses
SET status = CASE
  WHEN status IS NULL AND is_active = false THEN 'inactive'
  WHEN status IS NULL THEN 'active'
  ELSE status
END
WHERE status IS NULL;

UPDATE public.businesses
SET channels = '{}'::jsonb
WHERE channels IS NULL;

UPDATE public.businesses
SET banner_urls = '[]'::jsonb
WHERE banner_urls IS NULL;

UPDATE public.businesses
SET resource_urls = '[]'::jsonb
WHERE resource_urls IS NULL;

UPDATE public.businesses
SET direct_redirect = false
WHERE direct_redirect IS NULL;

UPDATE public.businesses
SET allow_low_rating_redirect = false
WHERE allow_low_rating_redirect IS NULL;

-- Lookup by public slug (app enforces uniqueness on insert; add UNIQUE separately after deduping if needed)
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses (slug);

CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON public.businesses (created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_businesses_plan_type ON public.businesses (plan_type);

CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON public.businesses (business_type);

CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses (status);

CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON public.businesses (is_active);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating integer;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_text text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

UPDATE public.reviews
SET created_at = timezone('utc', now())
WHERE created_at IS NULL;

UPDATE public.reviews
SET updated_at = COALESCE(updated_at, created_at, timezone('utc', now()))
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews (business_id);

CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_reviews_business_created ON public.reviews (business_id, created_at DESC NULLS LAST);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_business_id_fkey'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_business_id_fkey
      FOREIGN KEY (business_id)
      REFERENCES public.businesses (id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- scan_logs (POST /api/scan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS business_id uuid;
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS device text;
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

UPDATE public.scan_logs
SET created_at = timezone('utc', now())
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scan_logs_business_id ON public.scan_logs (business_id);

CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON public.scan_logs (created_at DESC NULLS LAST);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scan_logs_business_id_fkey'
      AND conrelid = 'public.scan_logs'::regclass
  ) THEN
    ALTER TABLE public.scan_logs
      ADD CONSTRAINT scan_logs_business_id_fkey
      FOREIGN KEY (business_id)
      REFERENCES public.businesses (id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
