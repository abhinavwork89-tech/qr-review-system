# Production logging strategy

## Where logs live

| Runtime | Destination | Prefix / format |
|---------|-------------|-----------------|
| Next.js server (API routes, RSC) | Hosting provider stdout (Vercel, Node, Docker) | `[app]` + JSON per line |
| Email flow | Same (domain `email` inside JSON) | `event` field e.g. `review_submitted_email_failed` |
| AI generations (audit) | Supabase `ai_review_generations` table | DB row per attempt |
| Client browser | Suppressed in production except gated debug | See env flags below |

## Structured logger

Use `createRouteLogger(domain, route, headers)` from `lib/logging/app-logger.ts`.

- **Levels:** `info`, `warn`, `error`
- **Correlation:** `x-correlation-id` request header or auto-generated UUID
- **Production noise:** `info` is off in production unless `APP_LOG_INFO=1`
- **Stacks:** only when `APP_LOG_STACK=1` or non-production

### Grep examples (production)

```bash
# All app logs
grep '\[app\]' 

# Email failures
grep '"domain":"email"' | grep '"level":"error"'

# AI route warnings/errors
grep '"route":"/api/ai/generate-review"'

# Review submissions
grep '"event":"submitted"'
```

## Critical events to watch

| Event | Domain | Severity |
|-------|--------|----------|
| `review_submitted_email_failed` | email | error |
| `insert_failed` (reviews) | review | error |
| `openai_fail` | ai | warn |
| `destination_rejected` | redirect | warn |
| `login_failed` | auth | warn |
| `upload_failed` | upload | error |

## Debug env flags (off in production)

| Variable | Purpose |
|----------|---------|
| `AI_GENERATE_DEBUG=1` | Verbose AI generate route (info) |
| `AI_REVIEW_DEBUG` / `NEXT_PUBLIC_AI_REVIEW_DEBUG` | AI eligibility audit (non-prod server) |
| `NEXT_PUBLIC_REVIEW_REDIRECT_DEBUG=1` | Redirect flow client logs |
| `NEXT_PUBLIC_REVIEW_I18N_DEBUG=1` | Locale switching |
| `MASTER_QR_DEBUG=1` | Master QR resolution |
| `APP_LOG_INFO=1` | Enable info-level `[app]` logs in production |
| `APP_LOG_STACK=1` | Include stack traces in production error JSON |

## Future external logging (optional)

No integration required for launch. When volume grows, forward stdout to:

- **Sentry** — unhandled errors + API 5xx alerts
- **Axiom / Logtail / Datadog** — JSON log aggregation, dashboards on `[app]` domain/event
- **LogRocket** — client session replay (separate from server logs)

Recommended: keep `[app]` JSON format unchanged so ingestion needs no code changes.

## Debugging a failure

1. Note time, business slug/id, and user action (review, AI, redirect).
2. Search host logs for `correlationId` (review id from API response or email log).
3. Check Supabase `ai_review_generations` for AI issues.
4. Check Resend dashboard for email delivery.
5. Reproduce with debug flags only in staging — never enable verbose client debug in prod.
