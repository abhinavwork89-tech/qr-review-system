# Deployment Guide

[← Documentation index](./README.md) · [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)

---

## Hosting model

| Component | Provider |
|-----------|----------|
| Next.js app | **Vercel** (inferred from `VERCEL_URL`, Next.js conventions) |
| Database + Storage | **Supabase** |
| Email | **Resend** |
| AI | **OpenAI** |

---

## Vercel deployment flow

1. Connect GitHub repository to Vercel project
2. Framework preset: **Next.js**
3. Build command: `npm run build` (default)
4. Output: Next.js App Router automatic
5. Set **Production** environment variables (see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md))
6. Deploy `main` (or your production branch)

---

## Environment setup

### Production scope

Set in Vercel → Project → Settings → Environment Variables → **Production**:

- `NEXT_PUBLIC_APP_URL` = public review host (no trailing slash)
- All Supabase, admin, Resend, OpenAI keys
- Debug flags **unset**

### Preview scope

- May use staging Supabase project
- `VERCEL_URL` auto-available for origin fallback
- Still set `NEXT_PUBLIC_APP_URL` if testing QR/email absolutes

### Development

- `.env.local` (gitignored)
- `npm run dev`

---

## Domain configuration

| Domain | Typical use |
|--------|-------------|
| `review.onecoreapp.com` | Public app + admin + API |
| `onecoreapp.com` | Marketing (root `/` redirects here) |

**DNS:** CNAME to Vercel; enable SSL (automatic).

**Important:** `NEXT_PUBLIC_APP_URL` must match the domain users scan on QRs.

---

## Production branch strategy

| Branch | Vercel env | Use |
|--------|------------|-----|
| `main` | Production | Live traffic |
| Feature branches | Preview | QA before merge |

Recommendation: require PR + preview smoke test before merge to `main`.

---

## Preview deployments

- Each PR gets unique `*.vercel.app` URL
- QR codes generated without `NEXT_PUBLIC_APP_URL` may use preview host — **not suitable for print testing**
- For QR/email QA on preview, set preview env `NEXT_PUBLIC_APP_URL` to preview URL temporarily

---

## Migration deployment process

1. **Staging:** `supabase db push` or CI migration against staging project
2. Run `npm run build` against staging
3. Smoke test: review submit, AI, `/m/` redirect, admin dashboard analytics
4. **Production:** apply same migrations during low traffic
5. **Deploy app** immediately after (or in same release) when RPC signatures change

See [docs/operations/migration-safety.md](../docs/operations/migration-safety.md).

**Recent critical migration:** `20260520120000_businesses_master_qr_target.sql`

---

## Production checklist

- [ ] `NEXT_PUBLIC_APP_URL` correct
- [ ] All required secrets set (Production scope only)
- [ ] Debug env vars unset
- [ ] Migrations applied to production Supabase
- [ ] Resend domain verified; `RESEND_FROM_EMAIL` valid
- [ ] Admin password rotated from default
- [ ] Smoke tests ([TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md))
- [ ] Re-download Master QRs if domain changed
- [ ] Monitor Vercel logs + Supabase metrics post-deploy

---

## Rollback guidance

### Application (Vercel)

1. Vercel → Deployments → **Promote** previous successful deployment
2. Faster than revert commit if incident is urgent

### Database

- **Additive migrations:** safe to leave DB ahead of rolled-back app
- **Do not** drop columns in panic without backup
- If new app requires new RPC, rolling back app without DB rollback is usually OK

### Secrets

- Rotating keys: update env → redeploy → revoke old key after 24h

---

## Build verification locally

```bash
npm ci
npm run build
npx tsc --noEmit
```

---

## Monitoring post-deploy

- `GET /api/health`
- Submit test review on staging slug
- Scan test Master QR → expect 302
- Check Resend dashboard for welcome email delivery
- Admin dashboard loads analytics without RPC errors

---

## See also

- [KNOWN_ISSUES_AND_RISKS.md](./KNOWN_ISSUES_AND_RISKS.md)
- [CONTRIBUTING_GUIDE.md](./CONTRIBUTING_GUIDE.md)
