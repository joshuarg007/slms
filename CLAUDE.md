# Site2CRM - Claude Code Guidelines

> **FOR CLAUDE: Read the SESSION STATE section before doing anything.**

---

## SESSION STATE
**Last Updated:** 2026-01-05

### Where We Left Off:
- Fixed CRITICAL triple-charge billing bug
- Implemented comprehensive safeguards: frontend + backend
- Added loading skeletons, tooltips, accessibility, empty states
- Added CSV export, improved error boundary, API caching

### Immediate Next Steps:
- Deploy backend changes to production (billing.py safeguards)
- Deploy frontend changes to production (BillingPage.tsx)
- Test checkout flow to verify safeguards work

### Current Blockers:
- None

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
| Production | EC2 (34.230.32.54) | CloudFront | PostgreSQL (RDS) |

---

## Deployment

- **Backend**: Push to `main` → GitHub Actions → SSM deploy to EC2
- **Frontend**: Push to `main` → GitHub Actions → S3 + CloudFront invalidation

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

**SSH Key Location**: `/home/joshua/AllProjects/slms/site2crm-key.pem`

**SSH Command**:
```bash
ssh -i /home/joshua/AllProjects/slms/site2crm-key.pem ubuntu@34.230.32.54
```

**Server Paths**:
- App directory: `/opt/site2crm`
- Virtual env: `/opt/site2crm/.venv`
- Service: `sudo systemctl restart site2crm`

**Deploy Commands**:
```bash
# SSH and deploy
ssh -i /home/joshua/AllProjects/slms/site2crm-key.pem ubuntu@34.230.32.54 \
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

---

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
