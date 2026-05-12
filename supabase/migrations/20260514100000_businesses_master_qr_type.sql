-- Which destination the master QR resolves to (public scan flow).
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS master_qr_type text;

COMMENT ON COLUMN public.businesses.master_qr_type IS
  'google_review | instagram | facebook | whatsapp | twitter | website';
