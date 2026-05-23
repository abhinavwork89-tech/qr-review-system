-- Master QR dynamic target (payload always /m/{businessId}; runtime resolves destination).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS master_qr_target text;

COMMENT ON COLUMN public.businesses.master_qr_target IS
  'review_page | google_review | instagram | facebook | whatsapp | website | youtube | x | resource';

UPDATE public.businesses
SET master_qr_target = COALESCE(
  CASE
    WHEN master_qr_type = 'twitter' THEN 'x'
    WHEN master_qr_type IN (
      'google_review',
      'instagram',
      'facebook',
      'youtube',
      'whatsapp',
      'website'
    ) THEN master_qr_type
    ELSE NULL
  END,
  'review_page'
)
WHERE master_qr_target IS NULL OR trim(master_qr_target) = '';

ALTER TABLE public.businesses
  ALTER COLUMN master_qr_target SET DEFAULT 'review_page';
