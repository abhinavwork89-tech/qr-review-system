# Admin Panel Reference

[← Documentation index](./README.md) · [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**Base path:** `/admin`  
**Auth:** Cookie session after login at `/admin/login`

---

## Route map

| Route | Page | Purpose |
|-------|------|---------|
| `/admin` | Redirect | → dashboard or login |
| `/admin/login` | Login form | Email/password → `POST /api/admin/login` |
| `/admin/dashboard` | Dashboard | Analytics charts, AI stats |
| `/admin/businesses` | Business list | Search/filter businesses |
| `/admin/businesses/new` | Alias | New business |
| `/admin/add-business` | Add business | Full onboarding form |
| `/admin/business/[id]` | Business detail | Edit all settings + QR + reviews |
| `/admin/settings` | App settings | Global branding + AI platform settings |

---

## Module: Dashboard

**File:** `app/admin/(panel)/dashboard/page.tsx`

**Features:**

- Scan vs review trend charts (`lib/admin/analytics-trend.ts`)
- Period stats from `GET /api/admin/analytics`
- AI usage summary (generations, estimated cost) via RPC-backed queries

**API:** `GET /api/admin/analytics?period=...`

**Permissions:** Admin session required.

---

## Module: Business management

### List (`/admin/businesses`)

- Lists businesses with status, plan, dates
- Links to detail editor
- Loading state: `businesses/loading.tsx`

### Add business (`/admin/add-business`, `/admin/businesses/new`)

**Component:** `components/admin/add-business/add-business-form.tsx`

**Sections (typical):**

- Identity: name, brand, email, mobile, business type
- Branding: logo, colors, banners, language
- Google review URL, threshold, redirect flags
- Channels: Instagram, Facebook, YouTube, WhatsApp, website, X
- WhatsApp dial fields + Call CTA
- Master QR target selector
- Rewards: spin/scratch + prize list
- AI: enabled, language, daily limit, suggestion count
- Identity verification (type, number, proofs) where enabled
- Resources / media uploads

**Submit:** `POST /api/business`

**Validations:** `lib/admin/business-form-validation.ts`

- Slug generated server-side from brand name
- `validateMasterQrTargetForPersist` — target must have backing link
- WhatsApp/call validators via `lib/whatsapp/wa-me`, `lib/call/call-channel`
- Brand colors: `lib/admin/brand-color-validation.ts`
- Identity: `lib/business/identity.ts`

**Side effects:**

- Welcome email scheduled (`scheduleWelcomeEmailAfterCreate`)
- Master QR in email uses `/m/{newId}`

### Business detail (`/admin/business/[id]`)

**Component:** `components/admin/business/business-detail-editor.tsx`

**Features:**

- PATCH updates for all business fields
- Status changes (active/inactive) — lifecycle emails
- Plan type changes — plan emails
- **QR section:** `business-qr-section.tsx`
  - Master QR (indigo) — `/m/{id}`, target selector
  - Client Review QR (emerald) — `/r/{slug}`
- Reviews list / management UI (embedded)
- Delete business: `delete-business-button.tsx` → `DELETE /api/business/[id]` (soft delete semantics per status)

**API:** `PATCH /api/business/[id]`, `DELETE /api/business/[id]`

---

## Module: QR management

**Components:**

- `business-qr-section.tsx` — orchestrates both QR types
- `branded-qr-tile.tsx` — preview + download
- `master-qr-target-selector.tsx` — eligible targets UI

**Behavior:**

- Master payload always normalized via `normalizeMasterQrPayloadUrl`
- Target dropdown shows eligibility from `listMasterQrTargetEligibility`
- Download 1024 PNG; copy URL buttons
- Server PNG via `/api/qr-png` when needed

**Business rules:**

- Cannot select `google_review` target without valid `google_url`
- `review_page` requires slug
- Channel targets require enabled channel + valid URL

---

## Module: Reward settings

Configured inside business forms under **channels** JSON:

| Field | Type | Meaning |
|-------|------|---------|
| `spin_enabled` | boolean | Show spin wheel on review page |
| `scratch_enabled` | boolean | Show scratch card |
| `reward_config` | string[] | Prize labels |

**Display:** `reward-game-mode-display.tsx` in admin.

**Public:** `components/review/review-reward-games.tsx` + `POST /api/reward/claim`.

---

## Module: AI settings

### Per business (detail/add forms)

| Field | Meaning |
|-------|---------|
| `ai_enabled` | Business-level toggle |
| `ai_review_language` | `en` \| `hi` \| `hinglish` |
| `ai_daily_limit` | Per-business daily cap |
| `ai_suggestions_count` | Override plan default (null = plan-based) |

### Global (`/admin/settings`)

**API:** `GET/PATCH /api/admin/app-settings`, `PATCH /api/admin/app-settings/ai`

| Field | Meaning |
|-------|---------|
| `ai_enabled_global` | Master switch |
| `ai_emergency_disable` | Kill switch |
| `ai_model` | OpenAI model id |
| `ai_monthly_budget_limit` | Soft USD cap (estimated) |
| `ai_daily_global_limit` | Platform-wide daily cap |
| `ai_max_character_limit` | Suggestion length cap |
| `ai_default_cooldown_seconds` | Between generations |

---

## Module: App settings (branding)

**Page:** `/admin/settings`

- Footer branding logo URL
- Platform name / support contacts (per `app_settings` schema)
- Patched via `PATCH /api/admin/app-settings`
- Singleton row `id = 1` — insert guarded in `lib/data/app-settings-singleton.ts`

---

## Module: Review management

On business detail:

- Lists reviews for business (from `reviews` table)
- Read-only or operational actions per UI implementation
- Public submissions arrive via `POST /api/review`

---

## Module: Social links

Stored in `businesses.channels` jsonb:

```typescript
// lib/types/business.ts
channels: {
  primary?: "instagram" | "whatsapp" | ...
  instagram: { enabled, url, primary? }
  // facebook, youtube, website, x, whatsapp
}
```

Admin URL helpers: `lib/admin/admin-url-channels.ts`

Public rendering: `components/review/review-channels.tsx` — builds tracked outbound URLs.

---

## Module: Business types

**Routes:**

- `GET/POST /api/admin/business-types`
- `PATCH/DELETE /api/admin/business-types/[id]`

Catalog for onboarding dropdown; managed from settings or dedicated UI if present.

---

## Module: Onboarding flow

1. Operator completes add-business form
2. `POST /api/business` creates row + slug
3. Welcome email with Master QR attachment
4. Operator prints QR / shares Client Review link
5. Customer scans → review flow

---

## Permissions model

| Action | Requirement |
|--------|-------------|
| All `/admin/*` pages | `admin_session` cookie |
| All `/api/business/*`, `/api/admin/*` | `requireAdminSession()` |
| Public APIs | No admin; rate limited |

There are **no per-operator roles** in code — one shared admin account.

---

## Forms → API mapping

| Form | Method | Endpoint |
|------|--------|----------|
| Login | POST | `/api/admin/login` |
| Logout | POST | `/api/admin/logout` |
| Add business | POST | `/api/business` |
| Edit business | PATCH | `/api/business/[id]` |
| Delete business | DELETE | `/api/business/[id]` |
| App settings | PATCH | `/api/admin/app-settings` |
| AI settings | PATCH | `/api/admin/app-settings/ai` |
| Media upload | POST | `/api/upload/media` |
| Media delete | DELETE | `/api/upload/media` |

---

## Error handling

- Admin panel `error.tsx` boundary for panel routes
- API returns `{ error, fields? }` for validation failures
- Client forms show field-level errors from `fields` map

---

## See also

- [QR_SYSTEM.md](./QR_SYSTEM.md)
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) — admin QA section
