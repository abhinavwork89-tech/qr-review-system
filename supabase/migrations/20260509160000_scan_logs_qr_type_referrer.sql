-- Analytics: QR type + referrer on scan_logs (additive).

ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS qr_type text;
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS referrer text;

CREATE INDEX IF NOT EXISTS idx_scan_logs_business_qr_created
  ON public.scan_logs (business_id, qr_type, created_at DESC NULLS LAST);

COMMENT ON COLUMN public.scan_logs.qr_type IS 'master | google | instagram | facebook | whatsapp | website | x | resource';
COMMENT ON COLUMN public.scan_logs.referrer IS 'HTTP Referer or client-reported referrer when available';
