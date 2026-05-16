-- WhatsApp contact stored as country dial + national digits; wa.me URL is derived in app.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS whatsapp_country_code text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS whatsapp_number text;
