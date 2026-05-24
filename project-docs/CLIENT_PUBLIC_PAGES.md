# Client & Public Pages

[← Documentation index](./README.md) · [QR_SYSTEM.md](./QR_SYSTEM.md)

---

## Primary route

**URL:** `/r/[slug]`  
**File:** `app/(review)/r/[slug]/page.tsx`  
**Layout:** `app/(review)/layout.tsx`

---

## Page load flow

```text
GET /r/{slug}
  ▼
getBusinessBySlug(slug)
  ├─ not_found / inactive → InactiveBusinessView
  └─ active → activeBusinessToDisplay()
        ▼
     ActiveReviewView → ReviewExperienceClient
```

**Metadata:** `generateMetadata` — title `Review · {brand_name}`

**SSR data:**

- Business row + theme
- Global AI settings
- `ReviewDisplayModel` (URLs, flags, channels, rewards, AI eligibility)

**Debug (non-prod only):**

- `AI_REVIEW_DEBUG` / `NEXT_PUBLIC_AI_REVIEW_DEBUG`
- `MASTER_QR_DEBUG` — logs master URL resolution on server

---

## Review submission flow

**UI:** `components/review/review-experience-client.tsx` (and children)

```text
1. Optional direct_redirect (high rating) → outbound URL
2. Star rating selection
3. Optional contact fields (name, email, mobile) per config
4. Review text entry
5. POST /api/review
6. Thank-you state + confetti (optional)
7. Email to business (server-side)
```

**Validation:** `lib/validation/review-post.ts`  
**Contact rules:** `lib/review/review-contact-validation.ts`

---

## AI review suggestions

**When shown:** `display.aiReviewGenerationEnabled` from display model (global + business + plan + limits).

**Client action:** `POST /api/ai/generate-review`

```json
{
  "business_id": "uuid",
  "rating": 1-5,
  "language": "en" | "hi" | "hinglish" (optional)
}
```

**Response:** `{ suggestions: string[] }` or error codes (`rate_limited`, `ai_disabled`, etc.)

**UX:**

- Cooldown between requests (business + global settings)
- Copy-to-clipboard per suggestion
- Fallback text if OpenAI unavailable (`review-gen-fallback.ts`)
- Cached responses reduce duplicate OpenAI calls

**Languages:** Business `ai_review_language` + user locale from switcher.

---

## Rewards flow

**Components:**

- `review-reward-games.tsx` — orchestrates spin/scratch
- `rewards/reward-spin-wheel.tsx`
- `rewards/reward-scratch-game.tsx`

**Flow:**

```text
User completes rating / review step (per UX rules)
  → Game UI if spin_enabled or scratch_enabled
  → POST /api/reward/claim { business_id, game_type, ... }
  → Prize result displayed
  → confetti on win (review-confetti.ts)
```

**Config:** `channels.reward_config` string array (prize labels).

---

## Review language logic

| Layer | Source |
|-------|--------|
| Business default | `businesses.language` |
| UI locale | `ReviewI18nProvider` + `messages/review/{en,hi}.json` |
| AI generation | `ai_review_language` or request override |

**Switcher:** `review-i18n-provider.tsx` — persists preference client-side for session.

**Messages:** `lib/i18n/review-messages.ts`, `lib/i18n/review-locale.ts`

---

## Translations

| File | Locale |
|------|--------|
| `messages/review/en.json` | English |
| `messages/review/hi.json` | Hindi |

Keys cover: rating prompts, CTAs, reward copy, errors, thank-you.

Admin AI labels: `messages/admin/en.json`

---

## Responsive behavior

- SCSS: `clientPage.scss`, mobile-first channel grid
- Touch-friendly rating stars and game interactions
- Body scroll lock for modals: `lib/hooks/use-body-scroll-lock.ts`
- Images via `optimizable-image-url.ts` (Supabase transform)

---

## Social buttons

**Component:** `review-channels.tsx`

- Renders enabled channels from `display.channels`
- Each link → `buildTrackedScanOutUrl(businessId, qrType, destination)`
- **Never** uses `/m/` for channel taps — analytics require `scan/out`
- WhatsApp uses resolved `wa.me` URL
- YouTube URLs validated (`lib/review/youtube-url.ts`)

**Call CTA:** `tel:` link when `call_enabled` + valid E.164 parts.

---

## QR scan behavior on review page

On mount / visibility:

- `POST /api/scan` with `business_id`, `qr_type: "review_page"` (or equivalent)
- Deduped server-side to avoid duplicate logs on refresh

**Share QR on page:** May show Client Review QR (`/r/{slug}`) for customer sharing — uses same URL as printed Client Review QR.

---

## Review CTA flow (direct redirect)

When `direct_redirect` is true and rating ≥ `threshold` (default logic in `business-config.ts`):

- User may be sent directly to Google or primary channel without full review form
- Low ratings may stay on page if `allow_low_rating_redirect` is false

**Display model fields:**

- `directRedirect`, `directOutboundFromReviewPage`, `masterOutboundUrl`
- Resolved server-side in `activeBusinessToDisplay()`

---

## Inactive / error states

| State | Component |
|-------|-----------|
| Unknown slug | `InactiveBusinessView` |
| Inactive business | `InactiveBusinessView` |
| Error boundary | `app/(review)/r/[slug]/error.tsx` |
| Not found | `not-found.tsx` |

---

## Theming

- CSS variables from `primary_color`, `secondary_color`, theme_* fields
- Logo, banners (`banner_urls`), resources carousel
- Poppins font via `lib/fonts/poppins.ts` in layout

---

## Public app settings footer

`GET /api/app-settings` — branding footer logo/name for review page footer (read-only public).

---

## Security (public surface)

- Rate limits on review, AI, scan, reward endpoints
- CSP headers via middleware
- No PII stored in localStorage for review text (session UI state only)

---

## See also

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) — mobile & review flows
