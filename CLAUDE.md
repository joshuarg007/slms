# Site2CRM - Claude Code Guidelines

> **FOR CLAUDE: Read the SESSION STATE section before doing anything.**

---

## SESSION STATE
**Last Updated:** 2026-01-04

### Where We Left Off:
- v2.0.0 released and tagged
- Stripe billing configured and tested (live keys)
- Pen test passed - all security tests passed
- www.site2crm.io redirect configured via CloudFront Function
- Full signup → billing flow tested and working

### Immediate Next Steps:
- Update frontend messaging with real origin story
- Verify RDS automated backups enabled
- Configure Salesforce OAuth credentials (post-launch)

### Current Blockers:
- None

---

## MASTER RULES

1. **Time-Saving Lead Capture** - Site2CRM saves sales teams hours of manual CRM data entry. Born from cold calling frustration - 7 minutes per lead × 30 leads = 3.5 hours/day wasted. Now it's instant.

2. **One step at a time** - Don't overwhelm with multiple parallel tasks.

3. **⚠️ NEVER PUSH DIRECTLY TO MAIN/PRODUCTION ⚠️**
   - User runs local servers themselves (do NOT run `npm run dev` or `uvicorn`)
   - All development happens on `develop` branch
   - Only merge to `main` after thorough local testing by user
   - Production deploys only from `main` after user approval
   - **Branches**: `develop` → `main` → `production`

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

## Copyright

**Axion Deep Labs Inc.** (c) 2025
Contact: labs@axiondeep.com
