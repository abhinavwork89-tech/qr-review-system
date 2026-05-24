# Environment Variables

[← Documentation index](./README.md) · See also [docs/operations/secrets-and-rotation.md](../docs/operations/secrets-and-rotation.md)

**No `.env.example` is committed** (gitignored). Use this document as the contract.

---

## Required for production

| Variable | Required | Sensitivity | Purpose |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | **Yes** | Low (public) | Canonical origin: `https://review.onecoreapp.com` — QR URLs, emails, SSR |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Low | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Medium | Client/storage reads if used |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Critical** | Server DB + storage writes |
| `ADMIN_EMAIL` | **Yes** | Medium | Admin login |
| `ADMIN_PASSWORD` | **Yes** | **Critical** | Admin login |
| `RESEND_API_KEY` | **Yes** (if email on) | **Critical** | Transactional email |
| `OPENAI_API_KEY` | **Yes** (if AI on) | **Critical** | Review suggestions |

---

## Email (Resend)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `RESEND_API_KEY` | Yes | `re_...` | Server only |
| `RESEND_FROM_EMAIL` | Optional | `onboarding@yourdomain.com` | Must be verified in Resend |
| `RESEND_FROM_NAME` | Optional | `One Core App` | Display name |

Resolved in `lib/email/resolve-email-from.ts`.

---

## Admin & notifications

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `ADMIN_EMAIL` | Yes | `ops@company.com` | Login + notify list |
| `ADMIN_PASSWORD` | Yes | (strong secret) | Plain compare at login |

`ADMIN_EMAIL` may also receive internal notifications via `lib/email/resolve-recipient.ts`.

---

## Public app URL (critical)

| Variable | Dev | Production |
|----------|-----|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://review.onecoreapp.com` |

**Behavior** (`lib/public-app-origin.ts`):

- Production server **throws** if unset when resolving email/QR origins
- Non-prod may fall back to `VERCEL_URL` or localhost
- Client may use `window.location.origin` when env unset (dev only)

**Misconfiguration symptoms:**

- QRs point to wrong domain
- Welcome email links broken
- Master redirect resolves wrong host

---

## Supabase

| Variable | Required | Security |
|----------|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public (protect with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Never expose to client** |

Loaded via `lib/env.ts` → `getSupabaseServiceRoleEnv()`.

---

## AI

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | If AI enabled | `lib/ai/openai-provider.ts` |

---

## Vercel / hosting

| Variable | When | Notes |
|----------|------|-------|
| `VERCEL_URL` | Preview deploys | Auto-set; used as dev preview origin fallback |
| `NODE_ENV` | Always | `production` enables secure cookies, stricter logging |

---

## Debug & logging (optional — keep OFF in prod)

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_REVIEW_DEBUG` | off | Server AI eligibility audit logs |
| `NEXT_PUBLIC_AI_REVIEW_DEBUG` | off | Client-visible AI debug |
| `AI_GENERATE_DEBUG` | off | Verbose AI route logs |
| `MASTER_QR_DEBUG` | off | Master QR resolution on review page |
| `NEXT_PUBLIC_REVIEW_REDIRECT_DEBUG` | off | Direct redirect debug |
| `NEXT_PUBLIC_REVIEW_I18N_DEBUG` | off | i18n key debug |
| `APP_LOG_INFO` | off | Info logs in production |
| `APP_LOG_STACK` | off | Stack traces in production logs |
| `EMAIL_TEMPLATE_DB_LOOKUP` | off | When `"true"`, DB template lookup |

---

## Feature flags

| Variable | Values | Purpose |
|----------|--------|---------|
| `EMAIL_TEMPLATE_DB_LOOKUP` | `true` / unset | Email template resolution path |

---

## Security rules

1. **Never** prefix secrets with `NEXT_PUBLIC_`
2. Store production secrets only in **Vercel Production** environment
3. Rotate keys per [secrets-and-rotation.md](../docs/operations/secrets-and-rotation.md)
4. After deploy, grep `.next` bundle for accidental `sk-` / `re_` / service JWT

---

## Local development setup

```bash
# .env.local (not committed)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=dev-only-password
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
RESEND_FROM_EMAIL=onboarding@verified-domain.com
```

Run: `npm run dev` (port 3000).

---

## See also

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [CONTRIBUTING_GUIDE.md](./CONTRIBUTING_GUIDE.md)
