-- Public Call CTA: optional dial-in number separate from legacy customer_care_number.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS call_enabled boolean DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS call_country_code text DEFAULT '91';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS call_number text;

UPDATE public.businesses
SET call_enabled = COALESCE(call_enabled, false)
WHERE call_enabled IS NULL;

UPDATE public.businesses
SET call_country_code = CASE
  WHEN call_country_code IS NULL OR trim(call_country_code) = '' THEN '91'
  ELSE trim(call_country_code)
END
WHERE call_country_code IS NULL OR trim(call_country_code) = '';
