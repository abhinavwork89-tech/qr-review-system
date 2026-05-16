# Secrets safety and key rotation

## Server-only secrets (never `NEXT_PUBLIC_*`)

| Variable | Used for |
|----------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | All server DB/storage writes |
| `OPENAI_API_KEY` | AI review generation |
| `RESEND_API_KEY` | Transactional email |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin panel login |
| `ADMIN_SESSION` internals | Cookie session (derived in code) |

## Client-safe public vars

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional; anon key is public by design if RLS is strict |

**Never** prefix OpenAI, Resend, or service role keys with `NEXT_PUBLIC_`.

## Git / repo hygiene

- `.env`, `.env.local`, `.env.prod`, `.env.example` are in `.gitignore`.
- Do not commit real keys in PRs, screenshots, or example files.
- Rotate any key that was ever committed or shared.

## Production secret setup (recommended)

1. Set all secrets in **Vercel Environment Variables** (Production scope only).
2. Use separate Supabase projects for **staging** vs **production**.
3. Restrict Supabase service role to server runtime only.
4. Enable Supabase **JWT expiry** and review RLS policies on any anon-exposed tables.
5. Use strong `ADMIN_PASSWORD` (32+ random chars); store in password manager.

## Key rotation procedure

### Supabase service role

1. Supabase Dashboard → Settings → API → generate new service role key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in hosting env.
3. Redeploy app.
4. Revoke old key after confirming traffic healthy (24h).

### OpenAI

1. Create new key in OpenAI dashboard.
2. Update `OPENAI_API_KEY`, redeploy.
3. Delete old key after 24h.

### Resend

1. Create new API key in Resend.
2. Update `RESEND_API_KEY`, redeploy.
3. Revoke old key.

### Admin password

1. Set new `ADMIN_PASSWORD` in env.
2. Redeploy (invalidates no DB state; cookie sessions expire by maxAge).
3. Notify operators; old password stops working immediately after deploy.

## Audit checklist before go-live

- [ ] No secrets in client bundle (`next build` + search `.next` for `sk-`, `re_`, service role JWT prefix)
- [ ] Production env only on production host
- [ ] Debug flags unset (`AI_*_DEBUG`, `MASTER_QR_DEBUG`, etc.)
- [ ] `APP_LOG_INFO` unset unless you want verbose prod info logs
