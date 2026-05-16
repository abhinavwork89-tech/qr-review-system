# Migration safety audit

## Principles

1. **Additive first** — `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
2. **No destructive DDL in hot paths** without backup + maintenance window.
3. **RPC/functions** — `CREATE OR REPLACE` is safe for logic updates; test on staging.
4. **One migration per deploy** when possible for easier rollback reasoning.

## Current migration inventory (high level)

| Migration | Risk | Notes |
|-----------|------|-------|
| `20260509120000` app_settings, business_types | Low | Bootstrap |
| `20260509130000` businesses, reviews schema | Low | Indexes additive |
| `20260509140000` defaults, list indexes | Low | |
| `20260509160000` scan_logs qr_type | Low | |
| `20260511120000` identity columns | Low | |
| `20260512120000` identity media | Low | |
| `20260513120000` whatsapp | Low | |
| `20260514100000` master_qr_type | Low | |
| `20260515140000` call_cta | Low | |
| `20260516120000` AI infrastructure | Medium | New table + RPC; test AI dashboard after |
| `20260517140000` AI cache column | Low | |
| `20260518180000` performance indexes + AI RPCs | Low | Indexes + stats functions |

## Rollback considerations

- **Indexes:** safe to leave in place if app rolled back; unused indexes are harmless.
- **New columns:** app rollback may ignore extra columns.
- **Dropped columns/tables:** avoid in production without backup.
- **RPC changes:** old app may call new RPC signatures — deploy app + migration together.

## Pre-deploy checklist

1. Run migrations on **staging** first: `supabase db push` or CI pipeline.
2. Run `npm run build` against staging env.
3. Smoke-test: review submit, AI generate, dashboard analytics (uses `ai_dashboard_period_stats` RPC).
4. Apply to production during low traffic.
5. Monitor `[app]` logs for `insert_failed`, RPC errors.

## Duplicate index policy

Before adding indexes, search existing migrations for `idx_*` on same columns. `20260518180000` adds only `idx_reviews_rating` (not previously indexed).
