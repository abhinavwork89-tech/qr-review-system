# Backup and recovery checklist

Operational readiness only — uses Supabase/hosting built-ins, no custom backup jobs in this repo.

## Supabase database

1. **Enable Point-in-Time Recovery (PITR)** on the production project (Pro plan or add-on).
2. **Daily backups** — confirm automatic backups in Supabase Dashboard → Database → Backups.
3. **Before each migration deploy:** note current migration version; take a manual backup if the change is non-trivial.
4. **Restore test:** quarterly restore to a staging project from backup snapshot.

### Recovery steps (DB)

1. Stop traffic or enable maintenance mode on the app.
2. Supabase Dashboard → restore to new project or PITR to timestamp.
3. Update `NEXT_PUBLIC_SUPABASE_URL` and keys if project URL changed.
4. Run pending migrations on restored DB only if restore is behind schema.
5. Smoke-test: admin login, one review submit, one AI generate, dashboard analytics.

## Supabase storage (`business-media` bucket)

1. Storage is **not** included in SQL-only backups — use Supabase storage replication or periodic export of critical objects if compliance requires it.
2. **Operational minimum:** document public URLs stored on `businesses` rows; re-upload from admin if bucket loss occurs.
3. **Preventive:** avoid manual deletes outside admin UI; use soft-delete patterns for businesses where possible.

## Environment and secrets

1. Store production `.env` in a **password manager / Vercel env / CI secrets** — not in git.
2. Export a redacted env inventory after each rotation (key names only).
3. See `secrets-and-rotation.md` for rotation procedure.

## Migration rollback

1. **Prefer forward fix** — new additive migration to undo a bad column/index.
2. **Do not** run `supabase db reset` on production.
3. If a migration must be reverted: restore DB from pre-migration backup, redeploy previous app build.
4. Document each migration’s rollback notes in the migration file header when destructive.

## Application rollback

1. Redeploy previous Vercel/hosting deployment (git tag or release).
2. Ensure env vars match that build (no new required vars).
3. Verify health: `GET /api/health`.

## Emergency contacts / runbook

- Supabase status: https://status.supabase.com
- Resend status: https://status.resend.com
- OpenAI status: https://status.openai.com

Keep on-call access to: Supabase dashboard, hosting dashboard, Resend, domain/DNS.
