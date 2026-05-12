-- Identity document images (URLs from storage) and client profile photo.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS identity_proof_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS client_photo_url text;
