# Project Overview

[← Documentation index](./README.md)

## Product name

**One Core App** — QR Review Management Platform  
**Codebase:** `qr-review-system` (npm package name)

---

## Purpose

One Core App helps **local and multi-location businesses** collect customer reviews and drive traffic to the right destination (Google, social profiles, branded review page, WhatsApp, etc.) using **printable QR codes** and a **mobile-first review experience**.

Operators (internal admin users) onboard businesses, configure branding and channels, generate QR assets, and monitor scans and reviews. End customers scan a QR code or open a link, rate the business, optionally use **AI-generated review text**, claim **spin/scratch rewards**, and leave a review.

---

## Business problem solved

| Pain | How the product addresses it |
|------|------------------------------|
| Low review volume | Frictionless mobile flow + incentives (rewards) |
| Wrong link on printed QR | **Dynamic Master QR** — one permanent code, change destination in admin |
| Multiple destinations (Google vs Instagram vs review page) | Configurable **Master QR target** + separate **Client Review QR** |
| Inconsistent branding | Per-business colors, logo, banners, language |
| Manual follow-up | Welcome email with print-ready Master QR attachment |
| No visibility | Scan logs, review list, admin analytics dashboard |

---

## Target audience

| Role | Uses |
|------|------|
| **Platform operators** | Admin panel — create businesses, settings, analytics |
| **Business owners** | Indirect — receive welcome email, print QR, share review link |
| **End customers** | Public `/r/{slug}` review page — rate, review, rewards, social CTAs |

---

## Major features

### Core

- **Business CRUD** — identity, branding, channels, plan, status (active/inactive/deleted)
- **Public review page** — `/r/{slug}` themed per business
- **Master QR** — permanent URL `/m/{businessId}` with runtime redirect
- **Client Review QR** — fixed URL `/r/{slug}` for review collection only
- **Scan analytics** — `scan_logs` with `qr_type` and referrer
- **Tracked social outbound links** — `/api/scan/out` for channel buttons (not Master QR)

### Engagement

- **Rewards** — spin wheel and scratch card (configurable prize list)
- **AI review suggestions** — OpenAI-backed, rate-limited, cached per business/rating/language
- **i18n** — review UI in English and Hindi (`messages/review/`)

### Platform

- **Admin dashboard** — scans vs reviews trends, AI usage stats
- **App settings** — global branding footer, global AI toggles and budgets
- **Business types** — catalog for onboarding forms
- **Transactional email** — welcome, review submitted, status/plan lifecycle (Resend)

---

## QR architecture overview (summary)

Two QR concepts (see [QR_SYSTEM.md](./QR_SYSTEM.md) for full detail):

```
┌─────────────────────┐     ┌──────────────────────┐
│     MASTER QR       │     │  CLIENT REVIEW QR    │
│  /m/{businessId}    │     │    /r/{slug}         │
│  Dynamic redirect   │     │  Always review page  │
└──────────┬──────────┘     └──────────┬───────────┘
           │                            │
           ▼                            ▼
   master_qr_target              Branded review UI
   (google, instagram,          (rating, AI, rewards)
    review_page, etc.)
```

**Design principle:** Printed Master QR never changes; operators change **where it sends people** without reprinting.

---

## SaaS model (current)

- Businesses stored in Supabase with `plan_type` (e.g. `free`, `pro`, `pro_plus`)
- Plan affects **AI suggestion count** caps (see `lib/ai/suggestions-by-plan.ts`)
- No in-app billing integration in codebase at doc time — plan is operator-assigned
- Platform is **multi-tenant**: many businesses, one admin auth, shared infrastructure

---

## High-level request flow

```
Customer                    Platform
   │                           │
   ├─ Scan Master QR ─────────► GET /m/{id} ──► 302 destination
   ├─ Scan Review QR ─────────► GET /r/{slug} ──► Review UI
   ├─ Tap social button ──────► GET /api/scan/out ──► 302 + log scan
   ├─ Submit review ──────────► POST /api/review
   ├─ Claim reward ───────────► POST /api/reward/claim
   └─ Generate AI text ───────► POST /api/ai/generate-review

Operator
   └─ Admin UI ───────────────► /admin/* + /api/admin/* + /api/business/*
```

---

## What this product is not

- Not a generic link shortener (destinations are validated per business config)
- Not a full CRM or marketing automation suite (email set is transactional only)
- Not white-label multi-admin at doc time (single admin credential model)

---

## See also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — technical structure  
- [ADMIN_PANEL.md](./ADMIN_PANEL.md) — operator features  
- [CLIENT_PUBLIC_PAGES.md](./CLIENT_PUBLIC_PAGES.md) — customer-facing flows  
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) — QA coverage  
