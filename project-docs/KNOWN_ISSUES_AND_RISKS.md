# Known Issues, Limitations & Risks

[← Documentation index](./README.md)

Document reflects codebase and operational reality at documentation time. Update when mitigations ship.

---

## Product limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Single admin account | No per-user audit trail | External password manager; plan multi-admin auth |
| Plan/billing not automated | Manual `plan_type` in admin | Operational process |
| No multi-location entity | One business = one config | Future roadmap item |
| Master QR not tracked | No scan count for `/m/` | Use channel scan/out for analytics; future pixel |

---

## Technical debt

| Area | Notes |
|------|-------|
| `master_qr_type` + `master_qr_target` | Dual columns; legacy type synced on write — consolidate long-term |
| Legacy `scan/out?t=master` | Still in wild on old prints; code supports backward compat |
| In-memory rate limits | Resets on serverless cold start; not global across instances |
| `console.warn` debug paths | Gated by env flags; ensure off in prod |
| Admin auth | Plain env password compare — no MFA, no lockout table |

---

## Third-party risks

| Service | Risk | Contingency |
|---------|------|-------------|
| **Supabase** | Outage = full platform down | Status page; backups per ops doc |
| **Vercel** | Deploy/host outage | Rollback deployment |
| **Resend** | Email delivery delays/blocks | Monitor bounce; verify domain SPF/DKIM |
| **OpenAI** | Rate limits, cost spikes | Emergency disable; fallback strings; budget cap |
| **Google** | Review URL format changes | Validate URLs; manual admin update |

---

## Google review redirect behavior

- Redirect uses stored `google_url` — must be https and pass `isSafeHttpUrl`
- Google app vs browser may handle Maps/g.page links differently
- **Not guaranteed** to open “write review” sheet — depends on Google URL type
- iOS may open Google Maps app instead of browser

**QA:** Test on iOS + Android after every `google_url` change.

---

## QR scan limitations

| Issue | Detail |
|-------|--------|
| Legacy prints | Old Master QRs may still use `scan/out` — different analytics |
| Domain mismatch | QRs printed with wrong `NEXT_PUBLIC_APP_URL` go to wrong host |
| Logo overlay | Extreme logo size can reduce scan reliability — use defaults |
| Dark mode prints | Low contrast reduces scan success |

---

## Email client limitations

- **Inline CID QR removed** — attachment-only by design (blank inline in some clients)
- Some clients block attachments — body includes instruction to open attachment
- Outlook may require “Enable content” for images in template body

---

## Browser / device differences

| Area | Variance |
|------|----------|
| Confetti | `canvas-confetti` performance on low-end Android |
| Scratch canvas | Touch vs mouse events |
| CSP | `unsafe-inline` for scripts in middleware CSP — required by Next dev tooling |
| Safari ITP | May affect rare client storage patterns |

---

## Security considerations

| Risk | Status |
|------|--------|
| Service role on server only | Required pattern — never bundle to client |
| Open redirect via scan/out | Mitigated by `isScanDestinationAllowed` |
| Admin password in env | Rotate regularly; use strong secret |
| Public AI abuse | Rate limits + daily caps + IP limits |

---

## Serverless / scaling

- Rate limit state not shared across all Vercel instances
- Long-running batch jobs not supported in route handlers
- Cold starts may add latency to first `/m/` redirect

---

## Data & compliance

- Reviews store optional PII (name, email, mobile)
- No automated data retention/deletion UI documented
- Operators responsible for local privacy law compliance (consent text on review page)

---

## Migration risks

| Migration | Risk |
|-----------|------|
| AI RPC changes | Dashboard breaks if app/migration mismatch |
| `master_qr_target` backfill | Wrong default target if google_url empty — defaults to `review_page` |

---

## Future improvements (see roadmap)

Tracked in [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md).

---

## See also

- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- [docs/operations/secrets-and-rotation.md](../docs/operations/secrets-and-rotation.md)
