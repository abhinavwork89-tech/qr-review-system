# Project Documentation — QR Review Management Platform

**Repository:** `qr-review-system`  
**Product:** One Core App — QR-powered review collection SaaS  
**Status:** Live in production (documentation reflects current implementation)

This folder is the **single source of truth** for product, technical, QA, and operations documentation. It is separate from runtime code and from [`docs/operations/`](../docs/operations/) (runbooks).

---

## Quick links

| Document | Audience | Purpose |
|----------|----------|---------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Founders, PMs, new hires | What the product is and why it exists |
| [TECH_STACK.md](./TECH_STACK.md) | Engineers | Frameworks, services, libraries |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Engineers, architects | System design and data flows |
| [QR_SYSTEM.md](./QR_SYSTEM.md) | Everyone touching QR | Master QR, review QR, redirects, tracking |
| [ADMIN_PANEL.md](./ADMIN_PANEL.md) | Operators, engineers | Admin UI modules and rules |
| [CLIENT_PUBLIC_PAGES.md](./CLIENT_PUBLIC_PAGES.md) | Engineers, QA | Public review experience |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Engineers, integrators | HTTP API reference |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Engineers, DBAs | Tables, fields, migrations |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | DevOps, engineers | Env var contract |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | DevOps | Vercel + Supabase deploy |
| [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) | QA | Manual test matrices |
| [KNOWN_ISSUES_AND_RISKS.md](./KNOWN_ISSUES_AND_RISKS.md) | All | Limitations and debt |
| [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md) | Product | Possible enhancements |
| [CONTRIBUTING_GUIDE.md](./CONTRIBUTING_GUIDE.md) | Developers | How to work on this repo safely |

---

## Related repo docs

- [`docs/operations/secrets-and-rotation.md`](../docs/operations/secrets-and-rotation.md) — secrets handling
- [`docs/operations/migration-safety.md`](../docs/operations/migration-safety.md) — SQL migration policy
- [`docs/operations/logging-strategy.md`](../docs/operations/logging-strategy.md) — logging flags
- [`supabase/SCHEMA_AUDIT_REPORT.md`](../supabase/SCHEMA_AUDIT_REPORT.md) — schema audit snapshot
- [`AGENTS.md`](../AGENTS.md) — agent rules for this Next.js codebase

---

## Production URLs (typical)

| Surface | Example |
|---------|---------|
| Public app | `https://review.onecoreapp.com` |
| Marketing site | `https://onecoreapp.com` (root `/` redirects here) |
| Master QR | `https://review.onecoreapp.com/m/{businessId}` |
| Review page | `https://review.onecoreapp.com/r/{slug}` |
| Admin | `https://review.onecoreapp.com/admin` |

> **Warning:** `NEXT_PUBLIC_APP_URL` must match the public app host in production. See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).

---

## Documentation maintenance

When changing behavior, update **at minimum**:

1. [QR_SYSTEM.md](./QR_SYSTEM.md) — for any QR or redirect change  
2. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — for new/changed routes  
3. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — for migrations  
4. [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) — for new regression scenarios  

Last comprehensive doc pass: generated from codebase inspection (May 2026).
