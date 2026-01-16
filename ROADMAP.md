# Site2CRM Roadmap

## In Progress

### 1. Real-Time Lead Notifications
Alert sales team instantly when leads come in.

| Channel | Status | Notes |
|---------|--------|-------|
| Email | Ready to build | Use existing email service |
| Slack | Awaiting decision | Webhook URL (simple) vs OAuth app (full) |
| SMS | Awaiting Twilio | Need account credentials |
| Push | Planned | Browser push notifications |

**Settings needed:**
- Per-user notification preferences
- Quiet hours / schedule
- Filter by lead score or source

---

### 2. Form A/B Testing
Test form variants to optimize conversion.

- [ ] Create variant data model (form has multiple variants)
- [ ] Traffic splitting (50/50 or custom)
- [ ] Track submissions per variant
- [ ] Statistical significance calculation
- [ ] "Winner" badge when confident
- [ ] UI to create/manage variants

**No external dependencies - can start immediately.**

---

### 3. Lead Source Tracking
Know where every lead came from.

- [ ] Capture UTM params (source, medium, campaign, term, content)
- [ ] Capture referrer URL
- [ ] Capture landing page URL
- [ ] Store in lead record
- [ ] Display in lead detail view
- [ ] Filter/group leads by source in dashboard
- [ ] Source breakdown chart in analytics

**No external dependencies - can start immediately.**

---

### 4. Zapier/Make Integration
Connect to 5000+ apps without custom integrations.

| Approach | Effort | Notes |
|----------|--------|-------|
| Outgoing webhooks | 1-2 days | User pastes Zapier webhook URL, we POST leads |
| Full Zapier app | 1-2 weeks | Listed in Zapier marketplace, requires review |

**Recommendation:** Start with webhooks, upgrade to full app later.

---

### Support Page Video Tutorials
Short tutorial videos needed for the Help Center (`/app/support`):

| Video | Duration | Content |
|-------|----------|---------|
| Connect Your CRM | ~1:30 | OAuth flow, CRM selection, verifying connection works |
| Create Your First Form | ~2:00 | Form builder walkthrough, field selection, basic styling |
| Embed on Your Website | ~1:15 | Copy embed code, paste into HTML, verify form appears |
| Understanding Analytics | ~2:30 | Dashboard overview, lead metrics, reading reports |

**Format:** Loom recordings, YouTube unlisted, embed in app.

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

**Chat Widget**
- Live chat in addition to forms
- Different use case but natural expansion
- Compete with Intercom/Drift

---

## Completed

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
