# Testing & QA Checklist

[← Documentation index](./README.md) · [QR_SYSTEM.md](./QR_SYSTEM.md) · [ADMIN_PANEL.md](./ADMIN_PANEL.md)

Use this for manual regression before production releases and for onboarding QA engineers.

**Legend:** ✅ Happy path · ⚠️ Edge case · ❌ Failure case

---

## Production smoke tests (15 min)

| # | Test | Expected |
|---|------|----------|
| 1 | `GET /api/health` | 200 OK |
| 2 | Open `/admin/login` → login | Redirect to dashboard |
| 3 | Open active `/r/{slug}` | Review UI loads, themed |
| 4 | Scan Master QR `/m/{id}` | 302 to configured target |
| 5 | Submit 5-star review | 200, thank-you, email sent (check Resend) |
| 6 | Tap Instagram (if enabled) | 302 + scan_logs row |

---

## Admin flows

### Authentication

| Case | Steps | Expected |
|------|-------|----------|
| ✅ Login | Valid `ADMIN_EMAIL` / password | Cookie set; dashboard |
| ❌ Bad password | Wrong password | 401; no cookie |
| ✅ Logout | POST logout | Cookie cleared; login page |
| ⚠️ Deep link | Visit `/admin/businesses` logged out | Redirect to login?next= |

### Dashboard

| Case | Expected |
|------|----------|
| ✅ Load | Charts render; no console errors |
| ⚠️ Empty period | Graceful empty state |
| ✅ AI stats | Numbers match recent generations |

### Add business

| Case | Expected |
|------|----------|
| ✅ Full form | 201; slug returned; welcome email queued |
| ❌ Missing google for master target google_review | 400 + field errors |
| ⚠️ Slug collision | Server retries slug suffix |
| ✅ Master QR section | Shows `/m/{id}` only (not scan/out) |

### Edit business

| Case | Expected |
|------|----------|
| ✅ PATCH branding | Review page reflects colors/logo |
| ✅ Change master_qr_target | `/m/{id}` redirects to new dest without reprint |
| ✅ Inactive status | `/r/{slug}` inactive view; `/m/{id}` 404 |
| ✅ Delete | Business unavailable publicly |

### App settings

| Case | Expected |
|------|----------|
| ✅ PATCH footer logo | Review footer updates |
| ✅ Emergency AI disable | Public AI returns disabled |

### Media upload

| Case | Expected |
|------|----------|
| ✅ POST image | URL returned; displays in form |
| ❌ Oversized / invalid type | 400 |
| ✅ DELETE | Object removed |

---

## Onboarding flows

| Step | Verify |
|------|--------|
| Create business | Row in Supabase; slug unique |
| Welcome email | Received; PNG attachment scans to `/m/{id}` |
| Print Master QR | 1024 PNG readable by phone camera |
| Share Client Review QR | Opens `/r/{slug}` |

---

## QR scan flows

### Master QR (`/m/{businessId}`)

| Target | ✅ Expected |
|--------|-------------|
| `review_page` | 302 → `/r/{slug}` |
| `google_review` | 302 → google_url |
| `instagram` | 302 → IG URL |
| `whatsapp` | 302 → wa.me |
| `resource` | 302 → first resource URL |
| Inactive business | 404 |

### Client Review QR (`/r/{slug}`)

| Case | Expected |
|------|----------|
| ✅ Active slug | Review UI |
| ❌ Unknown slug | Inactive / unavailable view |
| ✅ POST /api/scan | Logged once (dedupe on refresh) |

### Legacy Master (`/api/scan/out?t=master`)

| Case | Expected |
|------|----------|
| ⚠️ Old printed QR | Still redirects + logs scan |
| ✅ New admin download | Encodes `/m/{id}` only |

---

## Redirect testing

| Case | Expected |
|------|----------|
| ✅ direct_redirect + high rating | Outbound URL without full form |
| ⚠️ Low rating + allow_low_rating_redirect false | Stays on review page |
| ❌ Tampered scan/out `u=` param | 400 destination not allowed |

---

## Email testing

| Template | Trigger | Checks |
|----------|---------|--------|
| Welcome | Business create | Attachment QR; no blank inline image |
| Review submitted | POST /api/review | To business email |
| Status / plan | PATCH business | Correct template |

**Clients:** Gmail, Outlook mobile, Apple Mail — attachment opens and scans.

---

## Mobile testing

| Area | Devices |
|------|---------|
| Review page | iOS Safari, Android Chrome |
| Rating tap targets | Min 44px touch |
| Spin / scratch | Touch works; no scroll trap |
| Language switch | EN ↔ HI copy updates |
| QR scan | Native camera app |

---

## Print testing

| Item | Check |
|------|-------|
| 1024 PNG | Sharp modules; logo not blocking scan |
| Level H | Damaged/smudge tolerance (light test) |
| Size | ≥ 2cm print width recommended |
| Contrast | Dark on light background |

---

## AI testing

| Case | Expected |
|------|----------|
| ✅ Enabled business + global | Suggestions returned |
| ❌ ai_emergency_disable | Blocked with clear error |
| ⚠️ Cooldown | Second request within cooldown rejected |
| ⚠️ Daily limit | 429 when exceeded |
| ✅ Cache hit | Faster response; `from_cache` in DB |
| ❌ Missing OPENAI_API_KEY | Fallback or error (per config) |
| ✅ Languages en / hi / hinglish | Appropriate script |

---

## Rewards testing

| Case | Expected |
|------|----------|
| ✅ Spin enabled | Wheel appears; claim API works |
| ✅ Scratch enabled | Scratch reveals prize |
| ❌ Claim spam | Rate limited |
| ⚠️ Empty reward_config | Graceful disable |

---

## Regression testing (release gate)

- [ ] Master QR URL never contains `scan/out` in admin download
- [ ] `/api/qr-png` rejects scan/out URLs
- [ ] `NEXT_PUBLIC_APP_URL` matches deployed domain
- [ ] No debug flags in production env
- [ ] Typecheck: `npx tsc --noEmit`
- [ ] Build: `npm run build`
- [ ] Migrations applied before app promote

---

## Failure cases (intentional)

| Scenario | Expected behavior |
|----------|-------------------|
| DB down | 500 on APIs; error boundary on pages |
| Resend failure | Review still saved; email logged as failed |
| Invalid UUID in `/m/xxx` | 404 |
| Rate limit exceeded | 429 JSON |

---

## See also

- [KNOWN_ISSUES_AND_RISKS.md](./KNOWN_ISSUES_AND_RISKS.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
