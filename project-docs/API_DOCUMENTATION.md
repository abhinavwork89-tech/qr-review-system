# API Documentation

[← Documentation index](./README.md)

All routes live under `app/api/**/route.ts`. Unless noted, responses are JSON.

**Auth legend:**  
- **Admin** — `admin_session` cookie via `requireAdminSession()`  
- **Public** — no auth; rate limits apply  
- **Redirect** — HTTP 302/404, not JSON  

---

## Health

### `GET /api/health`

| | |
|---|---|
| **Auth** | Public |
| **Purpose** | Liveness probe |
| **Response** | `{ ok: true }` or similar |

---

## Admin authentication

### `POST /api/admin/login`

| | |
|---|---|
| **Auth** | Public |
| **Body** | `{ email: string, password: string }` |
| **Success** | Sets `admin_session` cookie; `{ ok: true }` |
| **Failure** | 401 `{ error }` |
| **Side effects** | HttpOnly cookie, 7d maxAge, Secure in production |

### `POST /api/admin/logout`

| | |
|---|---|
| **Auth** | Public |
| **Purpose** | Clears admin cookie |

---

## Business (admin)

### `POST /api/business`

| | |
|---|---|
| **Auth** | Admin |
| **Purpose** | Create business + auto slug |
| **Body** | Large object: name, brand_name, email, mobile, channels, colors, google_url, threshold, redirects, master_qr_target, master_qr_type, AI fields, identity, whatsapp, call, media URLs, plan_type, status, … |
| **Success** | `{ id, slug }` |
| **Validation** | `parseBusinessBody`, sanitize insert, master target eligibility |
| **Side effects** | Welcome email scheduled; slug retry on collision |

### `PATCH /api/business/[id]`

| | |
|---|---|
| **Auth** | Admin |
| **Purpose** | Partial update |
| **Body** | Subset of business fields |
| **Side effects** | Lifecycle emails on status/plan changes; master_qr_type sync from target |

### `DELETE /api/business/[id]`

| | |
|---|---|
| **Auth** | Admin |
| **Purpose** | Soft-delete / mark deleted per business status rules |

---

## Admin analytics & settings

### `GET /api/admin/analytics`

| | |
|---|---|
| **Auth** | Admin |
| **Query** | `period` (e.g. week/month) |
| **Response** | Scan/review trends, AI stats aggregates |

### `GET /api/admin/app-settings`

| | |
|---|---|
| **Auth** | Admin |
| **Response** | Singleton `app_settings` row |

### `PATCH /api/admin/app-settings`

| | |
|---|---|
| **Auth** | Admin |
| **Body** | Branding / platform fields |

### `PATCH /api/admin/app-settings/ai`

| | |
|---|---|
| **Auth** | Admin |
| **Body** | Global AI toggles and limits |

### `GET /api/admin/business-types`

| | |
|---|---|
| **Auth** | Admin |
| **Response** | List of business types |

### `POST /api/admin/business-types`

| | |
|---|---|
| **Auth** | Admin |
| **Body** | `{ name, ... }` |

### `PATCH /api/admin/business-types/[id]`

| | |
|---|---|
| **Auth** | Admin |

### `DELETE /api/admin/business-types/[id]`

| | |
|---|---|
| **Auth** | Admin |

---

## Public app settings

### `GET /api/app-settings`

| | |
|---|---|
| **Auth** | Public |
| **Purpose** | Footer branding for review pages (safe fields only) |

---

## Review

### `POST /api/review`

| | |
|---|---|
| **Auth** | Public |
| **Rate limit** | 25/10min per IP; burst 3/min per IP+business |
| **Body** | `{ business_id, rating, review_text?, name?, email?, mobile? }` |
| **Success** | `{ ok: true, review_id }` |
| **Errors** | 400 validation, 404 business, 410 inactive, 429 rate limit |
| **Side effects** | INSERT `reviews`; `sendReviewEmail` async |

---

## Scan tracking

### `POST /api/scan`

| | |
|---|---|
| **Auth** | Public |
| **Body** | `{ business_id, qr_type?, ... }` per `app/api/scan/route.ts` |
| **Purpose** | Log review page or generic scan events |
| **Side effects** | INSERT `scan_logs` (deduped) |

### `GET /api/scan/out`

| | |
|---|---|
| **Auth** | Public (redirect) |
| **Query** | `b` (UUID), `t` (qr_type), `u` (encoded destination URL) |
| **Success** | 302 to destination |
| **Errors** | 400 invalid params, 404 business, 410 inactive, 400 destination not allowed |
| **Side effects** | INSERT `scan_logs` if not duplicate |
| **Note** | Legacy master scans (`t=master`) still supported |

---

## Master QR redirect (not under /api)

### `GET /m/[businessId]`

| | |
|---|---|
| **File** | `app/m/[businessId]/route.ts` |
| **Auth** | Public |
| **Success** | 302 to resolved master target |
| **Errors** | 404 inactive/unknown, 500 invalid destination |
| **Side effects** | None (no scan log) |

---

## AI

### `POST /api/ai/generate-review`

| | |
|---|---|
| **Auth** | Public |
| **Body** | `{ business_id: uuid, rating: 1-5, language?: string }` |
| **Success** | `{ suggestions: string[] }` |
| **Errors** | `ai_disabled`, `rate_limited`, `invalid_body`, 429, budget exceeded |
| **Side effects** | INSERT `ai_review_generations`; OpenAI API call; cache write |

### `GET /api/ai/generate-review`

Returns 405 — POST only.

---

## Rewards

### `POST /api/reward/claim`

| | |
|---|---|
| **Auth** | Public |
| **Body** | Parsed by `lib/validation/reward-claim-post.ts` |
| **Purpose** | Spin/scratch outcome |
| **Rate limits** | Yes (public rate limiter) |

---

## Media upload (admin)

### `POST /api/upload/media`

| | |
|---|---|
| **Auth** | Admin |
| **Body** | `multipart/form-data` — file + metadata |
| **Purpose** | Upload to Supabase Storage |
| **Response** | Public URL for business fields |

### `DELETE /api/upload/media`

| | |
|---|---|
| **Auth** | Admin |
| **Purpose** | Remove storage object |

---

## QR PNG (admin or validated)

### `GET /api/qr-png`

| | |
|---|---|
| **Auth** | Typically admin session or URL allowlist |
| **Query** | `url` — absolute URL must be `/m/` or `/r/` path only |
| **Response** | `image/png` |
| **Purpose** | Server-rendered high-res QR |

---

## Redirect routes (pages)

| Route | Method | Purpose |
|-------|--------|---------|
| `/r/[slug]` | GET | Review page HTML |
| `/` | GET | Redirect to marketing site |

---

## Error shape (common)

```json
{
  "error": "human or code message",
  "fields": { "fieldName": "reason" }
}
```

AI routes may use:

```json
{ "error": "rate_limited", "message": "..." }
```

---

## Rate limiting summary

| Endpoint | Typical limit |
|----------|----------------|
| `/api/scan/out` | 180/min IP |
| `/api/review` | 25/10min IP + burst |
| `/api/ai/generate-review` | 90/hour IP + cooldown |
| `/api/reward/claim` | Per route config |

Implementation: `lib/security/enforce-public-rate-limit.ts`, `lib/security/public-rate-limit.ts`.

---

## See also

- [QR_SYSTEM.md](./QR_SYSTEM.md)
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
