-- Optional identity fields for businesses (admin KYC-style capture).
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS identity_type text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS identity_number text;
