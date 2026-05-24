# Technology Stack

[← Documentation index](./README.md)

Versions from `package.json` at documentation time.

---

## Frontend

| Technology | Version | Role |
|------------|---------|------|
| **Next.js** | 16.2.4 | App Router, SSR/RSC, API routes, middleware |
| **React** | 19.2.4 | UI components |
| **TypeScript** | ^5 | Type safety across app and `lib/` |
| **Tailwind CSS** | ^4 | Utility styling (admin + review) |
| **Sass** | ^1.99.0 | Global/review SCSS (`app/assets/styles/`) |
| **Lucide React** | ^1.14.0 | Icons (admin) |
| **canvas-confetti** | ^1.5.4 | Reward win celebration (client) |
| **qrcode.react** | ^4.2.0 | Client-side QR preview + download (admin/review) |
| **babel-plugin-react-compiler** | 1.0.0 | React Compiler (dev) |

**Why Next.js App Router:** Single deployable for public pages, admin UI, and API; edge-friendly middleware for admin auth; route handlers for redirects (`/m/`, `/api/scan/out`).

**State management:** No Redux/Zustand. React `useState` / `useMemo` in client components; server components load data via `lib/data/*` and pass props.

---

## Backend (within Next.js)

| Layer | Implementation |
|-------|----------------|
| API | `app/api/**/route.ts` Route Handlers |
| DB access | `@supabase/supabase-js` via `lib/supabase/server.ts` (**service role** on server) |
| Validation | `lib/validation/*`, `lib/security/input-sanitize.ts`, form validators in `lib/admin/` |
| Rate limiting | `lib/security/enforce-public-rate-limit.ts` (in-memory, public APIs) |
| Logging | `lib/logging/app-logger.ts` structured route logs |

---

## Database & storage

| Service | Role |
|---------|------|
| **Supabase (PostgreSQL)** | Primary data store — businesses, reviews, scan_logs, app_settings, AI usage |
| **Supabase Storage** | Business media (logo, banners, resources, identity proofs) via upload API |

**Why Supabase:** Managed Postgres + storage + fast iteration; service role used server-side only (no client DB writes for sensitive tables).

---

## Email

| Technology | Version | Role |
|------------|---------|------|
| **Resend** | ^6.12.2 | Transactional email delivery |
| **@react-email/components** | ^1.0.12 | HTML email templates (`emails/`) |
| **@react-email/render** | ^2.0.8 | Render React → HTML for Resend |

Templates: welcome (Master QR attachment), review submitted, business status, plan expired/renewed.

---

## QR generation

| Library | Use |
|---------|-----|
| **qrcode** (Node) | Server PNG buffers — email attachment, `/api/qr-png` |
| **qrcode.react** | Browser canvas — admin preview/download, public page share QR |
| **sharp** (transitive via Next) | Server-side logo compositing on email QR (`lib/qr/render-branded-qr-png-buffer.ts`) |

Constants: `lib/qr/qr-constants.ts` — Level H, 1024px export, 260px preview.

---

## AI

| Service | Role |
|---------|------|
| **OpenAI API** | Review text suggestions (`lib/ai/openai-provider.ts`) |

Controls: global settings in `app_settings`, per-business flags, daily limits, monthly budget estimate, emergency disable, response caching in `ai_review_generations`.

---

## Analytics & tracking

| Mechanism | Storage |
|-----------|---------|
| `POST /api/scan` | `scan_logs` (review page load, typed) |
| `GET /api/scan/out` | `scan_logs` + HTTP 302 to destination |
| Reviews | `reviews` table |
| Admin dashboard | Aggregations + RPCs (`ai_dashboard_period_stats`, etc.) |

---

## Authentication

| Surface | Method |
|---------|--------|
| Admin panel | Cookie `admin_session` = `"1"` after `POST /api/admin/login`; env `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| Public APIs | No end-user auth; rate limits + validation only |

Middleware: `middleware.ts` protects `/admin/*` except `/admin/login`.

---

## Deployment & hosting

| Service | Typical use |
|---------|-------------|
| **Vercel** | Next.js hosting (inferred from `VERCEL_URL` in `lib/public-app-origin.ts`) |
| **Supabase Cloud** | Database + storage |

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## Internationalization

| Path | Locales |
|------|---------|
| `messages/review/en.json`, `hi.json` | Public review UI |
| `messages/admin/en.json` | Admin AI labels |
| `lib/i18n/*` | Locale resolution, review language switcher |

Business-level `language` + `ai_review_language` (en | hi | hinglish).

---

## Third-party dependencies (summary)

```text
Browser ──► Vercel (Next.js)
              ├── Supabase Postgres (service role)
              ├── Supabase Storage
              ├── Resend (email)
              └── OpenAI (AI suggestions)
```

---

## Development tooling

- **ESLint** 9 + `eslint-config-next` 16.2.4  
- **PostCSS** + Tailwind 4  
- **Supabase CLI** — migrations in `supabase/migrations/`  

---

## See also

- [ARCHITECTURE.md](./ARCHITECTURE.md)  
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)  
- [QR_SYSTEM.md](./QR_SYSTEM.md)  
