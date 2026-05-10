# Database schema audit — application usage

**Constraints honored:** no data deletion, no API or business-logic changes. All fixes are additive SQL.

---

## 1. Migration files (apply in order)

| File | Purpose |
| --- | --- |
| `migrations/20260509120000_app_settings_and_business_types.sql` | Base `app_settings`, `business_types` + seed types |
| `migrations/20260509130000_schema_stability_businesses_reviews.sql` | `businesses`, `reviews`, `scan_logs` shells/columns, `app_settings.created_at`, indexes, FKs `NOT VALID` |
| `migrations/20260509140000_schema_defaults_and_list_indexes.sql` | UTC `DEFAULT` on timestamps; composite indexes for list filters |

---

## 2. Application tables referenced by code

| Table | Main callers |
| --- | --- |
| `businesses` | `POST/DELETE/PATCH` `/api/business`, `GET` admin list/detail, `fetchBusinessBySlug`, `/api/review`, `/api/scan` |
| `reviews` | `POST` `/api/review`, admin business detail, dashboard aggregates |
| `app_settings` | `getAppSettingsPublic`, `PATCH` `/api/admin/app-settings` |
| `business_types` | Admin CRUD, `POST` `/api/business` (slug validation) |
| `scan_logs` | `POST` `/api/scan`, dashboard counts |

---

## 3. Requirement checklist (schema vs app)

| Requirement | Where stored | Status |
| --- | --- | --- |
| **status** | `businesses.status`, `businesses.is_active` | Columns + backfills in `…30000…` |
| **slug** | `businesses.slug`; `business_types.slug` | Indexed (`idx_businesses_slug`, `idx_business_types_slug` in earlier migration) |
| **Branding** | `brand_name`, colors, `logo_url`, `theme_*`; platform logo `app_settings.branding_logo_url` | Columns in `…30000…` |
| **Uploads / media** | `logo_url`, `banner_urls`, `resource_urls` (jsonb), legacy `banner_url` | Columns in `…30000…` |
| **Reward system** | `channels` jsonb (`spin_enabled`, `scratch_enabled`, `reward_config`, social links) | Single column; no separate reward table |
| **QR logic** | `slug`, `resource_urls`, `threshold`, `google_url`, redirect flags | Columns in `…30000…` |
| **Timestamps** | `created_at` / `updated_at` on businesses, reviews, app_settings; `business_types` has both; `scan_logs.created_at` | `…30000…` adds missing; `…40000…` sets UTC defaults |

---

## 4. Issues and fixes (summary)

| Table | Issue | Fix |
| --- | --- | --- |
| `businesses` | Not versioned before audit; columns must match insert/patch/select | `…30000…` |
| `businesses` | List UI orders by `created_at` | Column + `idx_businesses_created_at` |
| `businesses` | Filters use `plan_type`, `business_type`, `status` together | `idx_businesses_*` in `…30000…` + composites in `…40000…` |
| `businesses` | `banner_url` vs `banner_urls` duplicate semantics | Both columns allowed; merge/drop `banner_url` later if desired (manual) |
| `businesses` | `status` vs `is_active` redundant | Intentional in app; no drop |
| `businesses` | DB unique on `slug` skipped if duplicate slugs exist | Non-unique `idx_businesses_slug`; optional `CREATE UNIQUE INDEX CONCURRENTLY` after dedupe |
| `reviews` | Table not versioned | `…30000…` |
| `reviews` | Admin sorts by `created_at` | Index in `…30000…` |
| `app_settings` | Missing `created_at` vs app expectations | `…30000…` |
| `app_settings` | Defaults not explicitly UTC | `…40000…` |
| `business_types` | List sorts by `name` | `idx_business_types_name` in `…30000…` |
| `business_types` | Timestamp defaults | `…40000…` |
| `scan_logs` | Not versioned | `…30000…` (append-only; `updated_at` not used by app) |

---

## 5. Indexes added (by migration)

**`…30000…`**

- `businesses`: `slug`, `created_at`, `plan_type`, `business_type`, `status`, `is_active`
- `reviews`: `business_id`, `created_at`, composite `(business_id, created_at)`
- `scan_logs`: `business_id`, `created_at`
- `business_types`: `name`

**`…40000…`**

- `businesses`: `(business_type, status)`, `(status, plan_type)`

---

## 6. Types and duplicates (no automatic change)

- **`channels` / `banner_urls` / `resource_urls`:** intended `jsonb`. If a live DB has `text`/`json`, fix with a dedicated `ALTER … TYPE` migration after casting (not included; avoids breaking rows).
- **`status` + `is_active`:** duplicate meaning; kept for existing queries.

---

## 7. Manual follow-ups

1. `ALTER TABLE reviews VALIDATE CONSTRAINT reviews_business_id_fkey;` after orphan cleanup.
2. `ALTER TABLE scan_logs VALIDATE CONSTRAINT scan_logs_business_id_fkey;` after orphan cleanup.
3. Optional DB trigger to bump `businesses.updated_at` / `reviews.updated_at` on `UPDATE` (APIs do not set them today).
