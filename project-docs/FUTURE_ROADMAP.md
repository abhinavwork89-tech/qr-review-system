# Future Roadmap (Possible Enhancements)

[← Documentation index](./README.md)

**Not committed work** — product directions that align with current architecture gaps. Prioritize with founders/PMs before implementation.

---

## Analytics & insights

| Enhancement | Value |
|-------------|-------|
| Master QR scan tracking | Optional beacon on `/m/` without breaking print URLs |
| Campaign UTM parameters | Attribute scans to marketing campaigns |
| Funnel dashboard | Scan → rating → review → redirect conversion |
| Export CSV | Operator reporting |

---

## Multi-location & enterprise

| Enhancement | Value |
|-------------|-------|
| Parent org + locations | One brand, many slugs/QRs |
| Role-based admin | Manager vs super-admin |
| SSO / magic link admin | Replace shared password |
| Audit log | Who changed master target and when |

---

## Billing & subscriptions

| Enhancement | Value |
|-------------|-------|
| Stripe integration | Auto `plan_type` from subscription |
| Usage-based AI billing | Charge per generation over cap |
| Self-serve signup | Reduce manual onboarding |

---

## AI improvements

| Enhancement | Value |
|-------------|-------|
| Tone presets | Formal / casual / Hinglish mix |
| Industry templates | Auto context from `business_type` |
| Moderation layer | Block unsafe generated text |
| User feedback on suggestions | Improve prompts |

---

## QR & redirect

| Enhancement | Value |
|-------------|-------|
| Scheduled target switches | “Google until Friday, then Instagram” |
| A/B redirect | Split traffic for experiments |
| Short link domain | Branded `qr.brand.com` CNAME |
| SVG/PDF print pack | Print shop deliverables |

---

## White-label & marketing

| Enhancement | Value |
|-------------|-------|
| Custom admin domain | `reviews.partner.com` |
| Remove One Core footer | Agency tier |
| Marketing automation | Drip after signup, review reminders |
| SMS / WhatsApp notifications | Twilio integration |

---

## Review experience

| Enhancement | Value |
|-------------|-------|
| Photo upload with review | UGC moderation queue |
| NPS vs stars | Alternative metric |
| More locales | Regional languages |
| Accessibility audit | WCAG AA compliance |

---

## Technical platform

| Enhancement | Value |
|-------------|-------|
| Shared Redis rate limits | Accurate global throttling |
| Background job queue | Reliable email retries |
| E2E test suite | Playwright in CI |
| Feature flags | LaunchDarkly or similar |

---

## Prioritization framework (suggested)

1. **Revenue / retention** — billing, self-serve  
2. **Operator efficiency** — analytics, multi-location  
3. **End-customer conversion** — review UX, AI quality  
4. **Platform risk** — auth, rate limits, observability  

---

## See also

- [KNOWN_ISSUES_AND_RISKS.md](./KNOWN_ISSUES_AND_RISKS.md)
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
