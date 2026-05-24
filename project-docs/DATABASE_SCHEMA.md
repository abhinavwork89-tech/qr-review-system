# Database Schema

[← Documentation index](./README.md) · Migrations: `supabase/migrations/`

PostgreSQL on **Supabase**. Server uses **service role** for all application writes.

---

## Entity relationship (simplified)

```text
app_settings (singleton)
business_types (catalog)

businesses ──┬──< reviews
             ├──< scan_logs
             └──< ai_review_generations
```

---

## Table: `businesses`

**Purpose:** Core tenant record — branding, channels, QR config, AI, plan.

| Column | Type | Business meaning |
|--------|------|------------------|
| `id` | uuid PK | Business UUID (in Master QR URL) |
| `slug` | text | Public review URL `/r/{slug}` |
| `name` | text | Legal / display name |
| `brand_name` | text | Marketing name |
| `email`, `mobile` | text | Contact; email receives notifications |
| `business_type` | text | Category label |
| `status` | text | `active` \| `inactive` \| `deleted` |
| `is_active` | boolean | Legacy flag; synced with status |
| `plan_type` | text | `free`, `pro`, `pro_plus` — AI caps |
| `google_url` | text | Google review link |
| `threshold` | int | Min rating for direct redirect |
| `direct_redirect` | boolean | Skip review UI for high ratings |
| `allow_low_rating_redirect` | boolean | Allow redirect on low ratings |
| `channels` | jsonb | Social links + reward flags |
| `logo_url` | text | Branding |
| `banner_urls` | jsonb | Carousel images |
| `resource_urls` | jsonb | Downloadable resources / resource QR target |
| `primary_color`, `secondary_color` | text | Theme |
| `theme_primary`, `theme_background`, `theme_foreground` | text | Extended theme |
| `language` | text | Default review UI language |
| `customer_care_number` | text | Support display |
| `whatsapp_country_code`, `whatsapp_number` | text | wa.me resolution |
| `call_enabled`, `call_country_code`, `call_number` | various | Call CTA |
| `identity_type`, `identity_number`, `identity_proof_urls`, `client_photo_url` | various | KYC-style fields |
| `master_qr_type` | text | Legacy QR type enum |
| **`master_qr_target`** | text | **Runtime master redirect target** |
| `ai_enabled` | boolean | Per-business AI |
| `ai_review_language` | text | en \| hi \| hinglish |
| `ai_daily_limit` | int | Daily AI cap |
| `ai_suggestions_count` | smallint | Override plan default |
| `created_at`, `updated_at` | timestamptz | Audit |

**QR-related:** `slug`, `master_qr_target`, `master_qr_type`, `google_url`, `channels`, `resource_urls`

**Indexes:** `idx_businesses_slug`, status, plan, created_at, etc. (see migrations)

**Production-sensitive:** Deleting rows affects live QRs; prefer `status = inactive`.

---

## Table: `reviews`

| Column | Type | Meaning |
|--------|------|---------|
| `id` | uuid PK | Review id |
| `business_id` | uuid FK → businesses | Owner |
| `rating` | int | 1–5 stars |
| `review_text` | text | Customer comment |
| `name`, `email`, `mobile` | text | Optional PII |
| `created_at`, `updated_at` | timestamptz | |

**Indexes:** `business_id`, `created_at`, `(business_id, created_at)`, `rating` (performance migration)

---

## Table: `scan_logs`

| Column | Type | Meaning |
|--------|------|---------|
| `id` | uuid PK | |
| `business_id` | uuid FK | |
| `event_type` | text | e.g. `scan` |
| `device` | text | User-agent |
| **`qr_type`** | text | Channel / context (`master`, `instagram`, `review_page`, …) |
| **`referrer`** | text | HTTP Referer |
| `created_at` | timestamptz | |

**Note:** Master QR path `/m/` does **not** write here; only `scan/out` and `POST /api/scan`.

---

## Table: `app_settings`

**Singleton** (`id = 1`).

| Column | Meaning |
|--------|---------|
| Branding fields | Footer logo, platform name |
| `ai_enabled_global` | Global AI master switch |
| `ai_model` | OpenAI model id |
| `ai_monthly_budget_limit` | Soft USD cap (estimated) |
| `ai_daily_global_limit` | Platform daily cap |
| `ai_emergency_disable` | Kill switch |
| `ai_max_character_limit` | Max suggestion length |
| `ai_default_cooldown_seconds` | Cooldown between gens |
| `updated_at`, `created_at` | |

---

## Table: `business_types`

Catalog for admin onboarding (name, ordering, active flag per migration).

---

## Table: `ai_review_generations`

| Column | Type | Meaning |
|--------|------|---------|
| `id` | uuid PK | |
| `business_id` | uuid FK | |
| `rating` | smallint | 1–5 |
| `language` | text | Generation language |
| `suggestions_count` | smallint | How many strings requested |
| `estimated_cost` | numeric | USD estimate |
| `model_used` | text | Model id |
| `generation_status` | text | pending \| completed \| failed \| blocked |
| `from_cache` | boolean | Served from cache |
| `ip_address`, `user_agent` | text | Abuse tracing |
| `created_at` | timestamptz | |

**Cache migration:** `20260517140000` adds `from_cache`.

Additional cache columns may exist in `ai_review_generations` for response reuse — see `lib/ai/review-gen-cache.ts`.

---

## RPC / functions (analytics)

Created in AI / performance migrations (e.g. `20260518180000_production_performance.sql`):

- `ai_dashboard_period_stats` — admin dashboard AI aggregates
- Other stats helpers referenced from `lib/ai/usage-stats.ts`

**Deploy rule:** Apply migration before deploying app code that calls new RPC signatures.

---

## Migration inventory

| File | Summary |
|------|---------|
| `20260509120000` | `app_settings`, `business_types` bootstrap |
| `20260509130000` | `businesses`, `reviews` stability |
| `20260509140000` | Defaults + list indexes |
| `20260509160000` | `scan_logs.qr_type`, `referrer` |
| `20260511120000` | Identity columns |
| `20260512120000` | Identity media |
| `20260513120000` | WhatsApp number fields |
| `20260514100000` | `master_qr_type` |
| `20260515140000` | Call CTA columns |
| `20260516120000` | AI infrastructure + `ai_review_generations` |
| `20260517140000` | `from_cache` on AI generations |
| `20260518120000` | YouTube comment / master QR type extension |
| `20260518180000` | Performance indexes + AI RPCs |
| **`20260520120000`** | **`master_qr_target` column + backfill** |

---

## Production-sensitive operations

| Operation | Risk |
|-----------|------|
| Drop `businesses` column used in redirect | Master/review breakage |
| Change `slug` | Breaks printed Client Review QRs |
| Hard delete business | Orphan analytics; broken QRs |
| Revoke service role | Total outage |
| RLS misconfiguration on anon | Data exposure (app uses service role server-side) |

---

## JSON: `channels` structure

See `lib/types/business.ts`:

- Social: `{ enabled, url, primary? }` per network
- Rewards: `spin_enabled`, `scratch_enabled`, `reward_config: string[]`

---

## See also

- [QR_SYSTEM.md](./QR_SYSTEM.md)
- [docs/operations/migration-safety.md](../docs/operations/migration-safety.md)
- [supabase/SCHEMA_AUDIT_REPORT.md](../supabase/SCHEMA_AUDIT_REPORT.md)
