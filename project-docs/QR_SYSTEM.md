# QR System — Full Reference

[← Documentation index](./README.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

This document describes the **actual** QR implementation in production code.

---

## Design goals

1. **One printable Master QR per business** — URL never changes: `{origin}/m/{businessId}`
2. **Dynamic destination** — Operators change `master_qr_target` in admin without reprinting
3. **Separate Client Review QR** — Always `{origin}/r/{slug}` for the branded review funnel
4. **Analytics on social taps** — Channel buttons use `/api/scan/out`, not Master QR
5. **No legacy master tracking in new QRs** — Old `scan/out?t=master` URLs are rewritten at generation time

---

## QR types comparison

| Concept | Encoded URL | Changes when admin edits target? | Logged on scan? |
|---------|-------------|-----------------------------------|-----------------|
| **Master QR** | `/m/{uuid}` | Redirect destination changes | No (direct 302) |
| **Client Review QR** | `/r/{slug}` | No (always review page) | Via `POST /api/scan` on page load |
| **Social / channel QR or link** | `/api/scan/out?b=&t=&u=` | Destination in `u` must match allowed URL | Yes |

---

## Master QR

### Payload generation

```typescript
// lib/qr/qr-urls.ts
buildMasterQrPayloadUrl(origin, businessId)
// → https://review.onecoreapp.com/m/550e8400-e29b-41d4-a716-446655440000
```

**Guards:**

- `normalizeMasterQrPayloadUrl()` — coerces legacy `scan/out?t=master` to `/m/{id}`
- `buildTrackedScanOutUrl(..., "master", ...)` — returns `/m/{id}` only (never scan/out)
- `/api/qr-png` — only allows paths starting with `/m/` or `/r/`

### Runtime request lifecycle

```text
Customer scans Master QR
  │
  ▼
GET /m/{businessId}
  │  app/m/[businessId]/route.ts
  ▼
getBusinessForMasterRedirect(businessId)
  │  Active business only (status + is_active)
  ▼
resolveMasterRedirectUrl(row, publicOrigin)
  │  resolveMasterQrTargetDestination() or fallback /r/{slug}
  ▼
HTTP 302 → destination (https only)
```

**Not found / inactive:** HTTP 404 plain text.

### Master QR targets (`master_qr_target`)

| Target | Resolved destination |
|--------|---------------------|
| `review_page` | `/r/{slug}` |
| `google_review` | `businesses.google_url` (validated https) |
| `instagram` | `channels.instagram.url` if enabled |
| `facebook` | `channels.facebook.url` if enabled |
| `youtube` | `channels.youtube.url` (YouTube-safe validator) |
| `website` | `channels.website.url` if enabled |
| `x` | `channels.x` or legacy `twitter` |
| `whatsapp` | `wa.me` from country+number or legacy channel URL |
| `resource` | First entry in `resource_urls` json array |

Stored value: `businesses.master_qr_target`. Legacy column `master_qr_type` mapped via `masterQrTypeToTarget()` when target null.

**Validation on save:** `validateMasterQrTargetForPersist()` — target must be eligible (link exists).

---

## Client Review QR (Public Review QR)

```typescript
buildPublicReviewQrUrl(origin, slug)
// → https://review.onecoreapp.com/r/my-brand-a1b2
```

- Fixed purpose: review collection UI
- Independent of `master_qr_target`
- Admin section labeled distinctly (emerald/indigo styling in `business-qr-section.tsx`)

---

## Dynamic redirect system (`/api/scan/out`)

Used for **review page social buttons** and legacy printed QRs — **not** for new Master QR payloads.

### Query parameters

| Param | Meaning |
|-------|---------|
| `b` | Business UUID |
| `t` | QR type (`google_review`, `instagram`, `master`, `review_page`, …) — see `lib/scan/qr-types.ts` |
| `u` | URL-encoded destination (must pass `isSafeHttpUrl`) |

### Request lifecycle

```text
GET /api/scan/out?b={id}&t={type}&u={dest}
  │
  ├─ Rate limit (180/min per IP)
  ├─ Validate UUID, qr type, destination URL
  ├─ Load business; 410 if inactive
  ├─ isScanDestinationAllowed(row, qrType, destination, reviewUrl)
  ├─ Insert scan_logs (unless recent duplicate)
  └─ 302 redirect to destination
```

**Security:** Destination must match business configuration for that `qr_type` — prevents open redirect abuse.

### Legacy Master QR

Old prints may still encode:

```text
/api/scan/out?b={id}&t=master&u={encodedDest}
```

These still work (logged + redirect). **New** generation must use `/m/{id}` only.

---

## Tracking URLs vs direct redirects

| Surface | URL pattern | scan_logs |
|---------|-------------|-----------|
| Master scan | `/m/{id}` | No |
| Review page visit | `POST /api/scan` | Yes |
| Channel button | `/api/scan/out` | Yes |

---

## Analytics behavior

`scan_logs` columns (from migrations):

- `business_id`, `event_type` (`scan`)
- `qr_type` — discriminates channel/master/review_page/etc.
- `referrer`, `device` (user-agent)
- Timestamps for dashboard aggregations

Admin dashboard reads trends via `app/api/admin/analytics` and `lib/admin/analytics-*`.

---

## QR generation pipeline

### Server-side PNG

| Step | File |
|------|------|
| Matrix encode | `lib/qr/render-qr-png-buffer.ts` (qrcode npm, level H) |
| Branding overlay | `lib/qr/render-branded-qr-png-buffer.ts` (logo center, sharp) |
| Constants | `lib/qr/qr-constants.ts` — 1024 export, 260 preview, margin 4 |
| HTTP download | `GET /api/qr-png?url=...` (admin session or validated public paths) |

### Client-side

| Step | File |
|------|------|
| Preview | `qrcode.react` in `branded-qr-tile.tsx` |
| Download | Canvas → PNG blob in browser |

---

## Branded QR generation

- Error correction **Level H** (damaged print tolerance)
- Logo composited at center for email attachment and high-res export
- Colors may follow business primary (admin tiles)

---

## Email QR behavior

`lib/email/welcome-master-qr.ts`:

1. Builds `/m/{businessId}` via `buildMasterQrPayloadUrl`
2. `renderBrandedQrPngBuffer` at 1024×1024
3. Attached to welcome email; body text explains attachment (no inline CID)

---

## Download / export flow (admin)

1. Business detail → QR section
2. Preview at 260px; download at 1024px
3. Optional server fetch `/api/qr-png?url={encoded absolute /m/ or /r/ url}`
4. `normalizeMasterQrPayloadUrl` applied before display/download

---

## Redirect examples

**Master → Google** (target = `google_review`, valid `google_url`):

```text
Scan: https://review.onecoreapp.com/m/abc-uuid
302 → https://g.page/r/xxxxx/review
```

**Master → Review page** (target = `review_page`):

```text
Scan: https://review.onecoreapp.com/m/abc-uuid
302 → https://review.onecoreapp.com/r/cafe-delight-x7k2
```

**Instagram button on review page:**

```text
Tap: https://review.onecoreapp.com/api/scan/out?b=abc&t=instagram&u=https%3A%2F%2Finstagram.com%2F...
302 → Instagram profile
(+ scan_logs row)
```

---

## Google review behavior

- Master target `google_review` → direct 302 to stored `google_url`
- Review page may also show Google CTA via tracked scan/out or direct redirect rules when `direct_redirect` + rating threshold met
- Google URL must pass `isSafeHttpUrl` — typically `https://g.page/...` or Maps place URLs

---

## QR quality settings

From `lib/qr/qr-constants.ts`:

| Setting | Value |
|---------|-------|
| Error correction | H |
| Export size | 1024 px |
| Preview size | 260 px |
| Quiet zone margin | 4 modules |

---

## Flow diagram (complete)

```mermaid
flowchart TD
  subgraph Master["Master QR"]
    MScan[Scan /m/id] --> MRoute[route.ts]
    MRoute --> MResolve[resolveMasterQrTargetDestination]
    MResolve --> M302[302 to dest]
  end

  subgraph Review["Client Review QR"]
    RScan[Scan /r/slug] --> RPage[Review page SSR]
    RPage --> RScanAPI[POST /api/scan]
    RPage --> RUI[Rating / AI / Rewards]
  end

  subgraph Social["Channel buttons"]
    BTN[Tap channel] --> OUT[/api/scan/out]
    OUT --> LOG[scan_logs insert]
    OUT --> S302[302 to channel URL]
  end
```

---

## Why this architecture

| Decision | Rationale |
|----------|-----------|
| `/m/{id}` without tracking | Permanent print URL; fewer moving parts; destination changes without new QR |
| Separate `/r/{slug}` | Marketing can share review link without changing master campaign target |
| scan/out for social | Per-channel analytics while keeping master scans clean |
| Legacy scan/out master support | Backward compatibility for old prints |
| Server PNG for email | Consistent 1024px print quality + logo |

---

## Production warnings

- After changing `NEXT_PUBLIC_APP_URL`, **re-download** QRs if old domain encoded
- Deploy `master_qr_target` migration before relying on new target field in prod
- Printed legacy master QRs still hit `scan/out` — monitor `qr_type=master` in logs during transition

---

## See also

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — `/api/scan`, `/api/qr-png`
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — `master_qr_target`, `scan_logs`
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) — QR regression tests
