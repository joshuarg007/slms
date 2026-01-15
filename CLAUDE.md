# Site2CRM - Claude Code Guidelines

> **FOR CLAUDE: Read the SESSION STATE section before doing anything.**

---

## SESSION STATE
**Last Updated:** 2026-01-15

### Where We Left Off:
- UptimeRobot status page COMPLETE
- EC2 upgraded to t3.small with Elastic IP (3.91.211.77)
- Email forwarding (support@site2crm.io -> labs@axiondeep.com) COMPLETE
- Security headers added to CloudFront
- All systems operational

### Immediate Next Steps:
- None - production ready

### Current Blockers:
- None

### Infrastructure Summary:
- **Elastic IP**: 3.91.211.77 (permanent)
- **Status Page**: https://stats.uptimerobot.com/lXaVgFmahF
- **Support Email**: support@site2crm.io (forwards to labs@axiondeep.com via ImprovMX)

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
