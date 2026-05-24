# System Architecture

[← Documentation index](./README.md) · See also [QR_SYSTEM.md](./QR_SYSTEM.md), [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## High-level diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Vercel (Next.js 16 App Router)                   │
├─────────────────┬──────────────────────┬────────────────────────────────┤
│  Public review  │  Admin panel         │  Route handlers (API + redirects)│
│  app/(review)   │  app/admin           │  app/api/*, app/m/*            │
└────────┬────────┴──────────┬───────────┴───────────────┬────────────────┘
         │                   │                           │
         └───────────────────┼───────────────────────────┘
                             ▼
                    lib/* (domain logic)
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   Supabase Postgres   Supabase Storage    Resend / OpenAI
```

---

## Frontend architecture

### Route groups

| Path prefix | Layout | Purpose |
|-------------|--------|---------|
| `app/(review)/r/[slug]` | Review layout + SCSS | Public branded review experience |
| `app/admin/*` | Admin layout | Operator dashboard (cookie auth) |
| `app/(site)/` | Site layout | Minimal marketing shell (if used) |
| `app/m/[businessId]` | None (route handler) | Master QR 302 redirect |
| `app/page.tsx` | Root | Redirect to `https://onecoreapp.com` |

### Rendering model

- **Server Components** load business data (`lib/data/business.ts`), global AI settings, and build `ReviewDisplayModel` (`lib/review/display-model.ts`).
- **Client Components** handle interactivity: rating, AI fetch, reward games, language switcher, scan logging.
- **No global client store** — props and local state only.

### Styling

- Tailwind for admin and utility classes
- SCSS pipeline: `app/assets/styles/mainStyle.scss`, `clientPage.scss`, variables in `common/variable.scss`
- Per-business CSS variables injected from theme colors on review page

---

## Backend / API architecture

All server mutations go through **Next.js Route Handlers** with:

1. **Auth** — `requireAdminSession()` for admin/business CRUD; public routes use rate limits only
2. **Supabase service role** — `createServiceRoleClient()` in `lib/supabase/server.ts` (bypasses RLS; server-only)
3. **Validation** — dedicated parsers in `lib/validation/*` and `lib/admin/business-form-validation.ts`
4. **Sanitization** — `lib/security/input-sanitize.ts` on business writes
5. **Logging** — `createRouteLogger` / `createAppLogger` with domain tags

---

## Folder structure (conceptual)

```text
app/                    # Routes (pages + API + /m redirect)
components/
  admin/                # Business forms, QR tiles, dashboard widgets
  review/               # Public review UI, channels, rewards
emails/                 # React Email templates + MasterEmailLayout
lib/
  admin/                # Form validation, analytics helpers
  ai/                   # OpenAI, limits, cache, eligibility
  data/                 # Supabase queries (business, settings, redirect)
  email/                # Resend senders, lifecycle, welcome QR
  qr/                   # URL builders, PNG render, constants
  review/               # Display model, business-config, i18n helpers
  scan/                 # QR types, tracked URLs, destination verify
  security/             # Rate limits, body size, sanitize
  supabase/             # Server client factory
  validation/           # API body parsers
messages/               # review/en.json, hi.json; admin strings
supabase/migrations/    # Ordered SQL migrations
middleware.ts           # Admin cookie gate + security headers
```

---

## Data flow: review submission

```text
Browser (ReviewExperienceClient)
  │ POST /api/review { business_id, rating, review_text, name?, email?, mobile? }
  ▼
parseReviewPostBody → rate limits → business active check
  ▼
INSERT reviews → optional sendReviewEmail (Resend)
  ▼
200 { ok, review_id }
```

Side effects: review row, transactional email to business email (if configured), dedupe via email flow helpers.

---

## Auth flow (admin)

```text
POST /api/admin/login { email, password }
  → compare to ADMIN_EMAIL / ADMIN_PASSWORD (lib/admin-auth.ts)
  → Set-Cookie: admin_session=1; HttpOnly; Secure (prod); SameSite=lax

middleware.ts on /admin/*
  → except /admin/login: require cookie === "1"
  → else redirect to /admin/login?next=...

API routes: requireAdminSession() → 401 JSON if missing
```

**Production note:** Single shared admin credential — not multi-user RBAC.

---

## Public app origin handling

Canonical origin: `NEXT_PUBLIC_APP_URL` via `lib/public-app-origin.ts`.

| Context | Function | Behavior |
|---------|----------|----------|
| SSR review page | `getServerRequestPublicOrigin()` | Request host or env |
| Email / server QR | `resolveEmailPublicAppOrigin()` | Env only; throws in prod if unset |
| Client admin preview | `resolvePublicAppOrigin()` | Env or `window.location.origin` |
| Master redirect | `getServerRequestPublicOrigin()` | Same as request |

Misconfigured origin breaks QR payloads and emails — see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).

---

## QR architecture (summary)

| Entry | Handler | Tracking |
|-------|---------|----------|
| Master QR | `GET /m/{businessId}` | **No** scan_logs on redirect |
| Social / channel buttons | `GET /api/scan/out?b=&t=&u=` | Yes — deduped `scan_logs` |
| Review page load | `POST /api/scan` | Yes — `qr_type` e.g. `review_page` |

Full detail: [QR_SYSTEM.md](./QR_SYSTEM.md).

---

## Email architecture

```text
lifecycle-triggers.ts
  ├── scheduleWelcomeEmailAfterCreate → send-welcome-email.tsx
  │     └── welcome-master-qr.ts → renderBrandedQrPngBuffer (/m/{id})
  ├── on review POST → send-review-email.tsx
  └── status/plan hooks → transactional templates

send-app-email.ts → Resend API (RESEND_API_KEY)
resolve-email-from.ts → RESEND_FROM_EMAIL / RESEND_FROM_NAME
```

Templates live in `emails/templates/`. Master QR is **attachment-only** (no inline CID) for client compatibility.

---

## AI review generation flow

```text
Client: POST /api/ai/generate-review { business_id, rating, language? }
  ▼
Global: ai_enabled_global, emergency_disable, monthly budget
Business: ai_enabled, plan caps, daily limit, language
  ▼
Cooldown + IP rate limits + cache lookup (ai_review_generations + cache migration)
  ▼
OpenAI (or fallback strings) → insert generation row → return suggestions[]
```

Eligibility mirrored on SSR for UI flags: `compute-public-ai-review-enabled.ts`, `audit-public-ai-eligibility.ts`.

---

## Reward flow

- Config in `businesses.channels`: `spin_enabled`, `scratch_enabled`, `reward_config[]`
- Client: `review-reward-games.tsx` → `POST /api/reward/claim`
- Server: `lib/reward/public-reward-claim.ts` — validates prize, rate limits, returns outcome
- Confetti: `lib/review/review-confetti.ts` on win

---

## Business onboarding flow

```text
Admin: /admin/add-business or /admin/businesses/new
  → POST /api/business (admin session)
  → slug auto-generated from brand_name + random suffix
  → master_qr_target validated against links
  → INSERT businesses
  → scheduleWelcomeEmailAfterCreate (async)
       → Welcome email + Master QR PNG attachment (/m/{id})
```

Edit: `/admin/business/[id]` → `PATCH /api/business/[id]` — may trigger lifecycle emails on status/plan change.

---

## Redirect architecture (review page)

Two mechanisms:

1. **`direct_redirect`** — High ratings may skip review UI and open outbound URL (Google/channel) per `lib/review/business-config.ts` and display model.
2. **Master target** — Only affects `/m/{id}`, not `/r/{slug}`.

Social buttons always use **tracked** `/api/scan/out` URLs built in `review-channels.tsx`.

---

## Tracking architecture

| Event | Table | Key fields |
|-------|-------|------------|
| Page scan | `scan_logs` | `business_id`, `qr_type`, `referrer`, `device` |
| Outbound click | `scan_logs` | same + redirect via scan/out |
| Review | `reviews` | `rating`, `review_text`, PII fields |
| AI gen | `ai_review_generations` | cost estimate, status, cache flag |

Dedupe: `hasRecentScanLog` prevents burst duplicate scan rows per business + qr_type.

---

## Environment handling

- Server secrets never `NEXT_PUBLIC_*` (see operations doc)
- Production **requires** `NEXT_PUBLIC_APP_URL`
- Debug flags (`MASTER_QR_DEBUG`, `AI_*_DEBUG`) should be off in prod

---

## Migration handling

- SQL files in `supabase/migrations/` applied in timestamp order
- Additive-only policy documented in `docs/operations/migration-safety.md`
- App deploy should align with migration apply (especially RPCs for analytics)

---

## Major reusable systems

| Module | Reuse |
|--------|-------|
| `lib/qr/qr-urls.ts` | All QR payload URL building |
| `lib/scan/master-qr-target.ts` | Target resolution admin + `/m` route |
| `lib/review/display-model.ts` | Single DTO for review UI |
| `lib/public-app-origin.ts` | All absolute URL generation |
| `lib/security/enforce-public-rate-limit.ts` | Public API protection |
| `components/admin/business/business-qr-section.tsx` | Master + Client QR admin UI |

---

## Security headers

Applied in `middleware.ts` for all matched routes: CSP, HSTS (HTTPS), `X-Frame-Options`, etc.

---

## See also

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [ADMIN_PANEL.md](./ADMIN_PANEL.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
