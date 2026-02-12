# Site2CRM Roadmap

## In Progress

### 1. Chat Widget Hardening
The AI chat widget is live and deployed. Round 2 (v3.0) complete — Shadow DOM + all Fix Now items.

**Remaining (Fix Later):**
| Issue | Severity | Description |
|-------|----------|-------------|
| GDPR consent banner | MEDIUM | EU users need consent before sessionStorage/tracking |
| Config caching | MEDIUM | Cache widget config in localStorage to avoid fetch on every page load |
| ~~iOS safe area insets~~ | ~~LOW~~ | ✅ Done — `env(safe-area-inset-bottom)` + `visualViewport` keyboard handler |
| ~~Server-side rate limit by session~~ | ~~LOW~~ | ✅ Done — 10 msgs/min per session_id, layered with IP limit |

---

### 2. Zapier Integration
Code complete (webhooks + OAuth 2.0), NOT yet deployed. See CLAUDE.md for deploy steps.

| Phase | Status |
|-------|--------|
| Webhook infrastructure | ✅ Complete |
| API additions (PATCH lead, notes) | ✅ Complete |
| OAuth 2.0 provider | ✅ Complete |
| Deploy to production | ⬜ Next |
| Zapier platform setup | ⬜ Blocked on deploy |
| Build triggers & actions | ⬜ Blocked on deploy |

---

### 3. Real-Time Lead Notifications
Alert sales team instantly when leads come in.

| Channel | Status | Notes |
|---------|--------|-------|
| Email | Ready to build | Use existing email service |
| Slack | Awaiting decision | Webhook URL (simple) vs OAuth app (full) |
| SMS | Awaiting Twilio | Need account credentials |
| Push | Planned | Browser push notifications |

---

### 4. Form A/B Testing
Test form variants to optimize conversion.

- [ ] Create variant data model (form has multiple variants)
- [ ] Traffic splitting (50/50 or custom)
- [ ] Track submissions per variant
- [ ] Statistical significance calculation
- [ ] "Winner" badge when confident
- [ ] UI to create/manage variants

---

### 5. Lead Source Tracking
Know where every lead came from.

- [ ] Capture UTM params (source, medium, campaign, term, content)
- [ ] Capture referrer URL
- [ ] Capture landing page URL
- [ ] Store in lead record
- [ ] Display in lead detail view
- [ ] Filter/group leads by source in dashboard
- [ ] Source breakdown chart in analytics

---

### Support Page Video Tutorials
Short tutorial videos needed for the Help Center (`/app/support`):

| Video | Duration | Content |
|-------|----------|---------|
| Connect Your CRM | ~1:30 | OAuth flow, CRM selection, verifying connection works |
| Create Your First Form | ~2:00 | Form builder walkthrough, field selection, basic styling |
| Embed on Your Website | ~1:15 | Copy embed code, paste into HTML, verify form appears |
| Understanding Analytics | ~2:30 | Dashboard overview, lead metrics, reading reports |

---

## Backlog

### Medium Impact

**Email Sequences**
- Drip campaigns after form submit
- "Thanks for downloading" → 3 days → "Any questions?"
- Keeps Site2CRM sticky vs. just a form tool

**Calendar Booking**
- Calendly-style booking embedded in forms
- Lead submits → immediately books a call
- Reduces friction for sales

**Mobile App**
- iOS/Android or PWA
- Notifications + lead list
- Sales reps are on phones, not desktops

**White-labeling**
- Remove Site2CRM branding
- Custom domain for widget
- Target: agencies reselling to clients

### Lower Priority

**AI Lead Scoring**
- ML-based scoring: "this lead looks like past converters"
- Train on org's historical conversion data
- More accurate than rule-based scoring

---

## Completed

### 2026-02-11: Chat Widget v3.0 — Shadow DOM + Full Hardening
**Round 1 — SPA Awareness + Reliability:**
- SPA route detection (pushState/replaceState/popstate)
- GTM / tag manager support (fallback DOM query for `document.currentScript`)
- Duplicate widget prevention, async Google Fonts, retry with backoff, configurable z-index
- Fixed widget visibility on site2crm.io and made4founders.com

**Round 2 — Shadow DOM + Accessibility + Hardening:**
- **Shadow DOM encapsulation**: All widget DOM + styles inside shadow root — host page CSS cannot bleed in
- **Accessibility**: ARIA labels on all interactive elements, `role="dialog"` on chat window, `role="log"` + `aria-live="polite"` on messages, Escape key closes chat, focus trap (Tab cycles within chat), `focus-visible` outlines on all buttons, screen-reader-only utility class
- **Message fetch timeout**: AbortController with 15s timeout — no more infinite typing spinners
- **sessionStorage safety**: try/catch wrapper for sandboxed iframe contexts
- **Font fallback**: `system-ui` in font stack — graceful degradation if Google Fonts blocked
- **Send throttle**: 1-second cooldown between sends — prevents message spam
- **Semantic HTML**: Bubble is now a `<button>` instead of `<div>` — keyboard navigable by default
- **Typing indicator**: Uses `role="status"` + `aria-label` for screen readers; query by data attribute instead of `document.getElementById` (which doesn't work in shadow DOM)

**Round 3 — iOS + Session Rate Limiting:**
- **iOS safe area insets**: `env(safe-area-inset-bottom)` on bubble, chat window, input area, and mobile breakpoint — no more hidden input behind iOS home bar
- **iOS keyboard handler**: `visualViewport` resize listener shifts chat window up when virtual keyboard opens, resets on close
- **Session-based rate limiting**: 10 msgs/min per session_id (backend), layered with existing 20 msgs/min per IP — prevents per-session abuse with friendly AI messages

### 2026-01-15: Marketplace Listings & API Documentation
- **G2 Listing** - 15 screenshots prepared and submitted
- **Capterra Listing** - Submitted, awaiting approval (1-2 days)
- **API Documentation Page** (`/developers`) - Full REST API docs with:
  - Authentication guide (X-Org-Key header)
  - Rate limiting (60 req/min)
  - Endpoint documentation
  - Code examples (cURL, JS, Python, PHP)
- **Analytics Page** - Wired up existing AnalyticsPage.tsx to `/app/analytics` route
- **Demo Video** - Added YouTube demo to Help Center and Support page

### 2026-01-15: Launch Day
- v1.0.0 tagged and deployed
- UptimeRobot status page configured
- Tawk.to live chat with triggers
- Knowledge Base (12 articles)
- Email forwarding (support@site2crm.io)

### 2026-01-08: Pre-Launch Polish
- GDPR compliance (data export + account deletion)
- Favicons and OG image
- Health endpoint with DB check
