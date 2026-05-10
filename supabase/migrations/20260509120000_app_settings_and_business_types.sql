-- Singleton app branding / footer configuration (used by public review footer + admin settings).
CREATE TABLE IF NOT EXISTS app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  branding_logo_url text,
  powered_by_url text NOT NULL DEFAULT 'https://onecore.example',
  copyright_text text NOT NULL DEFAULT '',
  copyright_year smallint NOT NULL DEFAULT EXTRACT(year FROM now())::smallint,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Master list of business types; businesses.business_type stores the slug string.
CREATE TABLE IF NOT EXISTS business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_types_slug ON business_types (slug);

INSERT INTO business_types (slug, name) VALUES
  ('retail', 'Retail'),
  ('hospitality', 'Hospitality'),
  ('services', 'Services'),
  ('other', 'Other')
ON CONFLICT (slug) DO NOTHING;
