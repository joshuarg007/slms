# Site2CRM - Claude Code Guidelines

> **LOCAL DIRECTORY**: `~/projects/site2crm` (renamed from `slms`)
> **GITHUB REPO**: Still named `slms` — do not rename on GitHub

> **FOR CLAUDE: Read the SESSION STATE section before doing anything.**

---

## SESSION STATE
**Last Updated:** 2026-02-02 (evening)
**Status:** LAUNCHED (v1.0.0) + ZAPIER INTEGRATION CODE COMPLETE (not deployed)

### Where We Left Off:
- **Zapier Integration IN PROGRESS** - Code complete but NOT deployed
- All changes are LOCAL ONLY - nothing pushed to production yet
- User started Zapier integration in UI with API Key auth (WRONG) - needs to be deleted
- Need to deploy code then recreate Zapier integration with OAuth

### RESUME HERE - Zapier Integration Status:

**Code Complete (local, not deployed):**
1. ✅ Webhook models (`app/db/models.py` - Webhook, WebhookDelivery)
2. ✅ Webhook routes (`app/api/routes/webhooks.py`)
3. ✅ Webhook service (`app/services/webhook_service.py`)
4. ✅ Lead endpoints (`app/api/routes/leads.py` - PATCH, POST notes, GET activities)
5. ✅ OAuth models (`app/db/models.py` - OAuthClient, OAuthToken)
6. ✅ OAuth routes (`app/api/routes/oauth.py`)
7. ✅ Migrations (`alembic/versions/l9g0h1i2j3k4_add_webhooks_tables.py`, `m0h1i2j3k4l5_add_oauth_tables.py`)
8. ✅ Routers added to `main.py`

**To Deploy (run these commands):**
```bash
# 1. Commit and push
git add -A && git commit -m "Add Zapier integration: webhooks + OAuth 2.0" && git push

# 2. SSH and run migrations
ssh -i /home/joshua/projects/site2crm/site2crm-key.pem ubuntu@3.91.211.77
cd /opt/site2crm && sudo git pull && sudo .venv/bin/alembic upgrade head && sudo systemctl restart site2crm

# 3. Create Zapier OAuth client in database (run on server):
sudo -E .venv/bin/python << 'EOF'
import os, secrets
os.environ["DATABASE_URL"] = "postgresql+psycopg2://Site2CRM:Porange333!!!@site2crm-db.cgrkyeeii4fr.us-east-1.rds.amazonaws.com:5432/site2crm"
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
engine = create_engine(os.environ["DATABASE_URL"])
Session = sessionmaker(bind=engine)
db = Session()
from app.db import models
import json
client = models.OAuthClient(
    client_id=f"zapier_{secrets.token_urlsafe(16)}",
    client_secret=secrets.token_urlsafe(32),
    name="Zapier",
    redirect_uris=json.dumps(["https://zapier.com/dashboard/auth/oauth/return/App204567CLIAPI/"]),
    scopes="read write",
)
db.add(client)
db.commit()
print(f"Client ID: {client.client_id}")
print(f"Client Secret: {client.client_secret}")
db.close()
EOF
```

**Then in Zapier (delete old integration first, create new):**
- Auth Type: OAuth 2.0
- Authorization URL: `https://api.site2crm.io/oauth/authorize`
- Token URL: `https://api.site2crm.io/oauth/token`
- Test URL: `https://api.site2crm.io/oauth/me`
- Use client_id and client_secret from step 3

### Immediate Next Steps:
1. Deploy the Zapier code (commit, push, migrate)
2. Delete wrong Zapier integration in Zapier UI
3. Create OAuth client in database
4. Create fresh Zapier integration with OAuth
5. Build triggers and actions in Zapier

### Current Blockers:
- Zapier integration code needs to be deployed before continuing Zapier setup in UI

### DO NOT:
- Do NOT configure Zapier with API Key auth (we're using OAuth)
- Do NOT deploy partial features - deploy webhooks + OAuth together

### Marketplace Status:
| Platform | Status | Notes |
|----------|--------|-------|
| G2 | Submitted | 15 screenshots uploaded |
| Capterra | Submitted | Awaiting approval (1-2 days) |
| GetApp | Pending | Same Gartner network as Capterra |
| Software Advice | Pending | Same Gartner network |
| TrustRadius | Not started | |
| Product Hunt | Not started | |
| Zapier | Not started | See scope below |

---

## NEXT TIER ROADMAP

### Phase 1: Stickiness (Reduce Churn) 🎯 CURRENT FOCUS
| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| **Zapier Integration** | P0 | In Progress | Webhooks complete, need Zapier platform setup |
| Webhooks API | P1 | ✅ Complete | POST/GET/DELETE /api/webhooks + firing service |
| Email sequences | P2 | Not Started | Auto follow-up after lead capture |

### Phase 2: Growth (New Revenue)
| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| More CRMs | P1 | Not Started | Zoho, Close, Monday, Copper, Freshsales |
| Agency/White-label Plan | P1 | Not Started | $199/mo, manage client forms |
| Annual billing | P2 | Not Started | 20% discount, better cash flow |

### Phase 3: Scale (Technical Foundation)
| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| Redis | P1 | Not Started | Rate limits, caching, sessions |
| CDN for widget | P2 | Not Started | Faster load worldwide |
| E2E tests | P2 | Not Started | Playwright for critical flows |

### Phase 4: Polish
| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| Mobile app / PWA | P3 | Not Started | Check leads on the go |
| Multi-language forms | P3 | Not Started | International customers |
| Form templates marketplace | P3 | Not Started | Pre-built industry forms |

---

## ZAPIER INTEGRATION SCOPE

### Overview
Build a Zapier integration to connect Site2CRM to 5000+ apps. This is the #1 feature request and biggest growth unlock.

### What We'll Build

**Triggers (Events that start Zaps):**
| Trigger | Description | Type |
|---------|-------------|------|
| New Lead | Fires when lead captured via form or AI chat | Instant (webhook) |
| New Form Submission | Fires on any form submission | Instant (webhook) |
| Lead Updated | Fires when lead info changes | Polling |
| New AI Chat Conversation | Fires when chat conversation starts | Instant (webhook) |
| Lead Captured from Chat | Fires when AI chat captures email/phone | Instant (webhook) |

**Actions (Operations Zapier can perform):**
| Action | Description |
|--------|-------------|
| Create Lead | Add a new lead with contact info |
| Update Lead | Modify existing lead fields |
| Add Note to Lead | Attach notes to a lead |
| Find Lead by Email | Search for existing lead (for deduplication) |

**Searches:**
| Search | Description |
|--------|-------------|
| Find Lead | Look up lead by email or phone |
| Find Form | Get form by name or ID |

### Technical Requirements

1. **Webhook Infrastructure** (for instant triggers)
   - `POST /api/webhooks` - Register webhook URL
   - `DELETE /api/webhooks/{id}` - Unsubscribe
   - `GET /api/webhooks` - List active webhooks
   - Fire webhooks on: lead created, form submitted, chat conversation

2. **API Endpoints Needed**
   - All current endpoints work, but need:
   - `PATCH /api/leads/{id}` - Update lead (currently only PUT)
   - `POST /api/leads/{id}/notes` - Add note to lead

3. **Authentication**
   - Use API Key auth (simpler than OAuth for this use case)
   - Already have API keys for public API

4. **Zapier Platform Setup**
   - Register app at developer.zapier.com
   - Build using Platform UI (low-code)
   - Create 10+ Zap templates for marketplace listing

### Zap Templates to Create
1. Site2CRM Lead → Slack notification
2. Site2CRM Lead → Google Sheets row
3. Site2CRM Lead → Mailchimp subscriber
4. Facebook Lead Ad → Site2CRM Lead
5. Typeform submission → Site2CRM Lead
6. Site2CRM Lead → Gmail follow-up email
7. Site2CRM Lead → Trello card
8. Site2CRM Lead → Airtable record
9. Calendly booking → Site2CRM Lead
10. Site2CRM AI Chat → Slack notification

### Timeline Estimate
| Phase | Tasks | Estimate | Status |
|-------|-------|----------|--------|
| 1. Webhook infrastructure | Build webhook CRUD + firing | 1-2 days | ✅ Complete |
| 2. API additions | PATCH lead, POST notes | 0.5 day | ✅ Complete |
| 3. Zapier app setup | Register, configure auth | 0.5 day | Next |
| 4. Build triggers | 5 triggers with tests | 1-2 days | |
| 5. Build actions | 4 actions with tests | 1 day | |
| 6. Zap templates | Create 10 templates | 1 day | |
| 7. Submit for review | Documentation, test account | 0.5 day | |
| **Total** | | **5-8 days** | |

### Implementation Details (Phase 1-2 Complete)

**New Files Created:**
- `app/api/routes/webhooks.py` - Webhook CRUD endpoints (GET/POST/DELETE /api/webhooks)
- `app/services/webhook_service.py` - Webhook firing service with HMAC signatures

**Modified Files:**
- `app/db/models.py` - Added Webhook + WebhookDelivery models
- `app/api/routes/leads.py` - Added PATCH /leads/{id}, POST /leads/{id}/notes, GET /leads/{id}/activities
- `app/api/routes/chat_widget.py` - Added webhook firing for chat events
- `main.py` - Added webhooks router

**Webhook Events Implemented:**
- `lead.created` - Fires when new lead captured via form or API
- `lead.updated` - Fires when lead is updated
- `form.submitted` - Fires on form submission (same as lead.created for now)
- `chat.started` - Fires when AI chat conversation starts
- `chat.lead_captured` - Fires when AI chat captures email/phone

**API Endpoints Added:**
- `GET /api/webhooks` - List org webhooks
- `POST /api/webhooks` - Create webhook subscription
- `GET /api/webhooks/{id}` - Get webhook details
- `DELETE /api/webhooks/{id}` - Delete webhook
- `GET /api/webhooks/{id}/deliveries` - Delivery logs
- `POST /api/webhooks/{id}/test` - Send test payload
- `GET /api/webhooks/events` - List available events
- `GET /api/leads/{id}` - Get single lead
- `PATCH /api/leads/{id}` - Update lead fields
- `POST /api/leads/{id}/notes` - Add note to lead
- `GET /api/leads/{id}/activities` - Get lead activities

### Success Criteria
- [ ] All 5 triggers working in Zapier
- [ ] All 4 actions working in Zapier
- [ ] 10 Zap templates published
- [ ] Approved for Zapier public beta
- [ ] 50 active users (for full public listing)

---

### Infrastructure Summary:
- **Elastic IP**: 3.91.211.77 (permanent)
- **Status Page**: https://stats.uptimerobot.com/lXaVgFmahF
- **Support Email**: support@site2crm.io (forwards to labs@axiondeep.com via ImprovMX)
- **Live Chat**: Tawk.to with triggers, shortcuts, and KB articles
- **Demo Video**: https://youtu.be/i-xmSmN8rsY

### Recent Changes (2026-01-15 PM):
**Marketplace & API (Complete):**
- `slms-frontend/src/pages/public/DevelopersPage.tsx` - Full API documentation page
- `slms-frontend/src/pages/AnalyticsPage.tsx` - Wired to /app/analytics route
- `app/core/rate_limit.py` - Added public_api rate limit (60 req/min)
- `app/api/routes/leads.py` - Rate limiting on public API endpoint
- `slms-frontend/src/pages/public/HelpPage.tsx` - Embedded YouTube demo video
- `slms-frontend/src/pages/SupportPage.tsx` - Added demo video to tutorials
- `marketing/g2-screenshots/` - 15 screenshots for G2 listing
- Footer updated with API Docs link
- Settings page links to API documentation

### Recent Changes (2026-01-15 AM):
**Launch Day Polish (Complete):**
- `slms-frontend/src/data/knowledgeBase.ts` - Knowledge Base with 12 articles across 4 categories
- `slms-frontend/src/pages/public/KBArticlePage.tsx` - Article page with custom markdown rendering
- `slms-frontend/src/pages/public/HelpPage.tsx` - KB section added
- `slms-frontend/index.html` - Tawk.to triggers fixed (removed blocking CSS)
- `slms-frontend/src/index.css` - reCAPTCHA badge repositioned (bottom left)
- Added Zoho CRM to frontend branding (HomePage, FeaturesPage)
- Tawk.to fully configured: 8 canned shortcuts, page triggers, KB articles, brand colors
- Email forwarding verified working (ImprovMX -> WorkMail -> Gmail)

### Recent Changes (2026-01-08):
**Pre-Launch Polish (Complete):**
- `app/api/routes/users.py` - GDPR endpoints (GET /users/me/export, DELETE /users/me)
- `app/services/email.py` - Account deletion confirmation email
- `slms-frontend/src/pages/AccountPage.tsx` - Data Privacy section with export/delete UI
- `slms-frontend/src/pages/public/HelpPage.tsx` - Added GDPR FAQ items
- `slms-frontend/public/` - Complete favicon set (ico, 16x16, 32x32, apple-touch, android-chrome)
- `slms-frontend/public/og-image.png` - Fixed branding (Site2CRM + correct tagline)
- `slms-frontend/public/site.webmanifest` - PWA manifest
- `slms-frontend/index.html` - Updated favicon references
- `app/api/routes/core.py` - Enhanced /health endpoint with DB check
- `slms-frontend/src/components/marketing/MarketingFooter.tsx` - Status + Email links

### Recent Changes (2026-01-09):
**AppSumo Integration (Complete):**
- `app/api/routes/appsumo.py` - Full AppSumo code redemption system
- `app/db/models.py` - AppSumoCode model + org fields (appsumo_code, addendum fields)
- `slms-frontend/src/pages/AppSumoRedeemPage.tsx` - Redemption UI with dark mode
- `slms-frontend/src/pages/BillingPage.tsx` - Shows AppSumo plan details
- `app/services/email.py` - AppSumo welcome email template
- `app/core/plans.py` - AppSumo plan limits (1000 leads, 2 CRMs, 2 forms)
- Created `appsumo_codes` table in production PostgreSQL

**UI Improvements (2026-01-09):**
- Reduced logo sizes across app (sm=112px, md=144px, lg=192px)
- Fixed CRM error messaging with "Connect CRM" buttons
- StylesPage: Changed save notification from banner to toast

### Recent Changes (2026-01-08):
**Phase 1 (Complete):**
- `app/core/logging_config.py` - Structured logging with JSON format for production
- `app/core/errors.py` - Standardized API error responses
- `app/db/session.py` - Fixed pool_recycle (1800 → 600) for RDS compatibility
- `app/core/config.py` - Added environment validation
- `.env.example` - Template for environment configuration
- `main.py` - Integrated logging middleware and error handlers

**Phase 2 (Complete):**
- `tests/test_billing_safeguards.py` - Automated billing protection tests
- `tests/test_oauth_callbacks.py` - OAuth flow tests
- `.github/workflows/test.yml` - CI test workflow with coverage
- `.github/workflows/deploy-ssm.yml` - Tests run before deploy

---

## MASTER RULES

1. **Time-Saving Lead Capture** - Site2CRM saves sales teams hours of manual CRM data entry. Born from cold calling frustration - 7 minutes per lead × 30 leads = 3.5 hours/day wasted. Now it's instant.

2. **One step at a time** - Don't overwhelm with multiple parallel tasks.

---

## Project Overview

**Site2CRM** - Lead capture forms that sync directly to your CRM in real-time.

**Origin Story**: Built from frustration while cold calling. Manually entering each lead into CRM took 7 minutes. With 30+ leads/day, that's 3.5 hours wasted on data entry instead of closing deals.

**Target Market**: Sales teams, cold callers, anyone manually entering leads into CRMs.

**Core Value Proposition**: Stop wasting hours on manual CRM entry. Capture leads instantly.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.12), SQLAlchemy, PostgreSQL (RDS) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Infrastructure | AWS EC2, S3, CloudFront, SES, RDS |
| Billing | Stripe |
| CRM Integrations | HubSpot, Salesforce, Pipedrive, Nutshell |

---

## Key Directories

```
site2crm/
├── app/              # FastAPI backend
├── slms-frontend/    # React frontend
├── widget/           # Embeddable form widget
├── alembic/          # Database migrations
└── .github/workflows # CI/CD
```

---

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://site2crm.io |
| API | https://api.site2crm.io |
| API Docs | https://api.site2crm.io/docs |

---

## Environments

| Env | Backend | Frontend | Database |
|-----|---------|----------|----------|
| Local | localhost:8000 | localhost:5173 | SQLite |
| Production | EC2 (3.91.211.77 - Elastic IP) | CloudFront | PostgreSQL (RDS) |

---

## Deployment

**All deployments are automated via GitHub Actions. Push to `main` to deploy.**

| Component | Trigger | Pipeline |
|-----------|---------|----------|
| Backend | Push to `main` | GitHub Actions → SSM → EC2 |
| Frontend | Push to `main` | GitHub Actions → S3 → CloudFront invalidation |

Workflow files: `.github/workflows/`

---

## Important Files

| File | Purpose |
|------|---------|
| `/home/ubuntu/site2crm/.env` | Production environment (on EC2) |
| `/opt/site2crm/.env` | Secondary env (not used by service) |
| `app/core/config.py` | Settings loaded from env |
| `app/api/routes/billing.py` | Stripe integration |

---

## Credentials (Production)

**SSH Key Location**: `/home/joshua/projects/slms/site2crm-key.pem`

**SSH Command**:
```bash
ssh -i /home/joshua/projects/slms/site2crm-key.pem ubuntu@3.91.211.77
```

**Server Paths**:
- App directory: `/opt/site2crm`
- Virtual env: `/opt/site2crm/.venv`
- Service: `sudo systemctl restart site2crm`

**Deploy Commands**:
```bash
# SSH and deploy
ssh -i /home/joshua/projects/slms/site2crm-key.pem ubuntu@3.91.211.77 \
  "cd /opt/site2crm && sudo git pull && sudo .venv/bin/python -m alembic upgrade head && sudo systemctl restart site2crm"
```

**Database**: PostgreSQL on RDS
- Host: `site2crm-db.cgrkyeeii4fr.us-east-1.rds.amazonaws.com`
- User: `Site2CRM`
- DB: `site2crm`

---

## Billing Plans

| Plan | Monthly | Annual | Price IDs |
|------|---------|--------|-----------|
| Starter | $29 | $290 | price_1Sm2MgDONWOyN0HvUXfvluYZ (mo), price_1Sm2MgDONWOyN0Hv2KlY3vqs (yr) |
| Pro | $79 | $790 | price_1Sm2OQDONWOyN0HvC6Wgi0NN (mo), price_1Sm2OQDONWOyN0HvK1JwQasi (yr) |
| AppSumo | $249 one-time | Lifetime | No Stripe - codes redeemed at `/app/appsumo` |

### AppSumo Plan Limits
- 1,000 leads/month (hard cap)
- 2 CRM integrations
- 2 active forms
- No AI features
- No branding removal
- No priority support
- Non-transferable, no upgrade path

---

---

## PRODUCTION READINESS ROADMAP

### Phase 1 - Core Infrastructure ✅ COMPLETE (2026-01-08)
- [x] Fix database `pool_recycle` timeout (1800 → 600 for RDS compatibility)
- [x] Add structured logging configuration (`app/core/logging_config.py`)
- [x] Create standardized error response schema (`app/core/errors.py`)
- [x] Add environment validation in config
- [x] Create `.env.example` template
- [x] Integrate request logging middleware (timing, correlation IDs)

### Phase 2 - Observability & Testing (Target: Week 1)
- [x] **Sentry Integration** - Error tracking and alerting ✅ COMPLETE (2026-01-08)
  - Added `sentry-sdk[fastapi]` to requirements
  - Configured in `main.py` with DSN from environment
  - Set `traces_sample_rate=0.1` for performance monitoring
- [x] **Automated Test Suite** ✅ COMPLETE (2026-01-08)
  - Converted `billing_safeguards_manual.py` to pytest (`test_billing_safeguards.py`)
  - Added integration tests for Stripe webhooks (`test_webhook.py`)
  - Added OAuth callback tests (`test_oauth_callbacks.py`)
  - GitHub Actions runs tests before every deploy (`.github/workflows/deploy-ssm.yml`)
  - Separate test workflow with coverage reporting (`.github/workflows/test.yml`)
- [x] **Request Timing Alerts** ✅ COMPLETE (Phase 1)
  - Logging middleware warns for requests > 1 second
  - X-Process-Time header on all responses
- [x] **GDPR Compliance** ✅ COMPLETE (2026-01-08)
  - `DELETE /api/users/me` - Account deletion with email confirmation
  - `GET /api/users/me/export` - Data export (JSON download)
  - Account deletion confirmation email
  - Data Privacy section in Account page
  - FAQ updated with GDPR questions

### Phase 3 - Scaling & Hardening (Target: Month 1)
- [ ] **Redis-backed Rate Limiting**
  - Current: In-memory (single worker only)
  - Needed for: Multi-worker/horizontal scaling
  - Implementation: `redis-py` + sliding window
- [ ] **Blue/Green Deployment**
  - Two systemd services: `site2crm-a`, `site2crm-b`
  - Load balancer health check switching
  - Instant rollback capability
- [ ] **Pre-deploy Smoke Tests**
  - Add to GitHub Actions: `pytest tests/ --tb=short`
  - Post-deploy health check: `curl -f https://api.site2crm.io/health`
- [ ] **Database Query Optimization**
  - Add query timing logging
  - Identify N+1 queries with `sqlalchemy-utils`
  - Add composite index on `integration_credentials(org_id, provider)`
- [ ] **CSRF Protection**
  - Add double-submit cookie validation for public forms
  - Validate Origin header on state-changing requests

### Security Rotation Schedule
| Secret | Rotation Frequency | How to Rotate |
|--------|-------------------|---------------|
| SECRET_KEY | Every 90 days | Generate new: `openssl rand -base64 32` |
| Stripe keys | On compromise only | Regenerate in Stripe Dashboard |
| OAuth secrets | On compromise only | Regenerate in provider dashboard |
| Database password | Every 180 days | Update in RDS + `.env` |

---

## CRITICAL LESSONS LEARNED

### 🚨 BILLING BUG - TRIPLE CHARGE (2026-01-05)

**What Happened**: User made ONE purchase, got charged THREE times ($29 + $79 + $29 = $137).

**Root Cause**:
1. `FRONTEND_BASE_URL` was set to wrong domain (`axiondeep.com` instead of `site2crm.io`)
2. After Stripe checkout, user was redirected to blank page
3. User likely clicked back/retry, triggering multiple checkout sessions
4. NO SAFEGUARDS existed to prevent duplicate subscriptions

**Fixes Applied (2026-01-05)**:
1. ✅ Fixed `FRONTEND_BASE_URL` in production `.env`
2. ✅ Added loading/disabled state + sessionStorage lock to prevent double-clicks (BillingPage.tsx)
3. ✅ Backend rejects checkout if user already has active subscription for same plan (billing.py)
4. ✅ Added idempotency keys (5-minute time buckets) to Stripe checkout creation (billing.py)
5. ✅ Show "Redirecting to secure checkout..." banner during redirect (BillingPage.tsx)
6. ✅ Backend caches checkout URLs for 2 minutes - returns same URL on rapid requests (billing.py)

**Prevention Checklist** (for ALL payment integrations):
- [x] Always verify redirect URLs in production before going live
- [x] Disable checkout button after first click (sessionStorage + state)
- [x] Check for existing active subscriptions (backend 400 error)
- [x] Use Stripe idempotency keys (hash of org:plan:cycle:time_bucket)
- [ ] Test full payment flow end-to-end in production (with refund)

---

## Copyright

**Axion Deep Labs Inc.** (c) 2025
Contact: labs@axiondeep.com
