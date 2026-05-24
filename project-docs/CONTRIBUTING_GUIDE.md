# Contributing Guide

[← Documentation index](./README.md)

For engineers joining the **live production** QR Review platform.

---

## Golden rules

1. **Do not change business logic** in documentation-only tasks.
2. **Minimize scope** — smallest correct diff; match existing patterns.
3. **Production is live** — feature flags, migrations, and QR URLs affect printed materials.
4. **Read Next.js 16 docs** in `node_modules/next/dist/docs/` — APIs differ from older Next versions (`AGENTS.md`).

---

## Repository layout

| Path | Responsibility |
|------|----------------|
| `app/` | Routes only — thin handlers |
| `lib/` | Business logic, data access, integrations |
| `components/` | React UI (admin vs review) |
| `emails/` | React Email templates |
| `messages/` | i18n JSON |
| `supabase/migrations/` | Database changes |
| `project-docs/` | Product/technical documentation |
| `docs/operations/` | Runbooks (secrets, migrations, logging) |

---

## Coding patterns

### Data access

- Server: `createServiceRoleClient()` from `lib/supabase/server.ts`
- Never expose service role to client components
- Query helpers in `lib/data/*`

### URLs and QR

- Master: `buildMasterQrPayloadUrl` → `/m/{businessId}` only
- Review: `buildPublicReviewQrUrl` → `/r/{slug}`
- Social tracking: `buildTrackedScanOutUrl` (never `master` → scan/out)
- Origin: `resolvePublicAppOrigin()` / `resolveEmailPublicAppOrigin()`

### API routes

```typescript
export async function POST(request: Request) {
  const deny = await requireAdminSession(); // admin only
  if (deny) return deny;
  // parse → validate → supabase → NextResponse.json
}
```

Public routes: rate limit → validate body → business active check.

### Forms

- Client: controlled inputs in `components/admin/*`
- Validation: `lib/admin/business-form-validation.ts` + server re-validation
- Sanitize: `lib/security/input-sanitize.ts` on persist

### Styling

- Admin: Tailwind utility classes
- Review: SCSS + CSS variables from business theme

---

## Branch strategy

| Branch | Use |
|--------|-----|
| `main` | Production-ready |
| `feature/*` | New work |
| `fix/*` | Hotfixes |

Open PR → Vercel preview → QA checklist → merge.

---

## Local environment

1. Clone repo
2. Copy env vars per [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) into `.env.local`
3. `npm ci`
4. `npm run dev`
5. Apply migrations to dev Supabase: `supabase db push`

---

## Migration rules

1. **Additive only** in production (`ADD COLUMN IF NOT EXISTS`, etc.)
2. One logical change per migration file
3. Update [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) when adding columns
4. Test on staging before production
5. See [docs/operations/migration-safety.md](../docs/operations/migration-safety.md)

**Never** drop columns or tables without backup + maintenance window.

---

## Deployment flow

1. Merge to `main`
2. Apply Supabase migrations (if any)
3. Vercel auto-deploys
4. Run [production smoke tests](./TESTING_CHECKLIST.md#production-smoke-tests-15-min)
5. If QR domain changed, notify ops to re-export QRs

Details: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## Regression safety rules

| Change type | Required action |
|-------------|-----------------|
| QR URL format | Update [QR_SYSTEM.md](./QR_SYSTEM.md); full QR regression |
| New env var | Update [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) |
| New API | Update [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) |
| Admin form field | Update [ADMIN_PANEL.md](./ADMIN_PANEL.md) + validation tests |
| Migration | Staging apply + dashboard smoke |

Run before PR:

```bash
npx tsc --noEmit
npm run build
```

---

## Testing expectations

- No automated E2E suite in repo at doc time — **manual QA required**
- Use [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for releases
- Test Master QR, Client Review QR, and one channel scan/out per release
- Test welcome email attachment on real device

---

## Documentation updates

When your PR changes behavior, update `project-docs/` in the same PR (or immediately after).

Cross-link related docs in markdown.

---

## What not to do

- Commit `.env*` files or secrets
- Use `NEXT_PUBLIC_` for API keys
- Encode `scan/out?t=master` in new QR generation
- Skip server-side validation because “the form already validated”
- Force-push `main`
- Run destructive git commands without explicit approval

---

## Getting help

| Topic | Doc |
|-------|-----|
| QR behavior | [QR_SYSTEM.md](./QR_SYSTEM.md) |
| APIs | [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) |
| Ops / secrets | [docs/operations/](../docs/operations/) |
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## See also

- [KNOWN_ISSUES_AND_RISKS.md](./KNOWN_ISSUES_AND_RISKS.md)
- [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md)
