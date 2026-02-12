# Site2CRM

> **Stop wasting hours on manual CRM entry. Capture leads instantly.**

[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://site2crm.io)
[![API](https://img.shields.io/badge/API-FastAPI-009688)](https://api.site2crm.io/docs)
[![Frontend](https://img.shields.io/badge/frontend-React%2019-61DAFB)](https://site2crm.io)
[![Security](https://img.shields.io/badge/security-hardened-blue)](#security-audit)

---

## What is Site2CRM?

**Born from frustration.** While cold calling, I was spending 7 minutes manually entering each lead into my CRM. With 30+ leads a day, that's **3.5 hours wasted** on data entry—time that should be spent closing deals.

So I built Site2CRM.

Now leads flow directly from web forms into your CRM in real-time. No copy-pasting. No tab-switching. No typos. What used to take 7 minutes takes 0.

**The math:**
| Leads/Day | Manual Entry | With Site2CRM | Time Saved |
|-----------|--------------|---------------|------------|
| 30 | 3.5 hours | 0 | **3.5 hrs/day** |
| 50 | 5.8 hours | 0 | **29 hrs/week** |
| Team of 5 | 17.5 hours | 0 | **875 hrs/month** |

**Core Features:**
- Embeddable lead capture forms
- AI chat widget with lead capture
- Booking widget with calendar integration
- Real-time CRM sync (HubSpot, Salesforce, Pipedrive, Nutshell)
- AI-powered lead scoring & insights
- Webhook API for Zapier/Make integrations
- Multi-tenant architecture for teams
- 14-day free trial

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CloudFront    │     │   Nginx/EC2     │     │   PostgreSQL    │
│   (Frontend)    │────▶│   (FastAPI)     │────▶│   (RDS)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │   CRM APIs      │
        │               │  HubSpot/SF/etc │
        │               └─────────────────┘
        ▼
┌─────────────────┐
│   S3 Bucket     │
│   (Static)      │
└─────────────────┘
```

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | **FastAPI** (Python 3.12, async) |
| Database | **PostgreSQL** (RDS) + SQLAlchemy 2.0 |
| Auth | **JWT** + HTTP-only cookies |
| Billing | **Stripe** (subscriptions, webhooks) |
| Email | **AWS SES** |
| Rate Limiting | In-memory with IP tracking |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | **React 19** + TypeScript |
| Build | **Vite 7** |
| Styling | **Tailwind CSS** |
| Charts | **Plotly.js** |

### Infrastructure
| Component | Service |
|-----------|---------|
| Compute | AWS EC2 (Ubuntu) |
| CDN | CloudFront |
| DNS | Route 53 |
| CI/CD | GitHub Actions |

---

## Security Audit

**Last Tested:** 2026-01-04

### Penetration Test Results

| Test | Status | Details |
|------|--------|---------|
| SQL Injection (Login) | **PASS** | Parameterized queries via SQLAlchemy |
| SQL Injection (Signup) | **PASS** | Pydantic validation + ORM |
| XSS (Input Fields) | **PASS** | Input sanitization |
| JWT None Algorithm | **PASS** | Algorithm enforcement |
| JWT Token Tampering | **PASS** | Signature validation |
| Path Traversal | **PASS** | Framework routing protection |
| IDOR (User Endpoints) | **PASS** | Auth required + org scoping |
| CORS | **PASS** | Restricted to allowed origins |
| Webhook Signature | **PASS** | Stripe signature validation |
| Rate Limiting | **ACTIVE** | 10 login attempts/5 min, 5 signups/hour |

### Security Features

- **Multi-tenant isolation**: Organization-scoped data access
- **Password hashing**: bcrypt with salt
- **Token security**: HTTP-only cookies, short-lived JWTs
- **Email verification**: Required before login
- **User approval flow**: Owner must approve new org members
- **Webhook validation**: Stripe signature verification
- **Rate limiting**: Brute-force protection on auth endpoints

### Recommendations (Post-Launch)

| Priority | Issue | Fix |
|----------|-------|-----|
| Medium | Missing security headers | Add X-Frame-Options, CSP, HSTS via Nginx |
| Low | Server version disclosure | Remove `server` header in Nginx |

---

## Production Readiness Roadmap

### Phase 1 - Core Infrastructure ✅ COMPLETE
- [x] Structured logging with JSON format (`app/core/logging_config.py`)
- [x] Standardized API error responses (`app/core/errors.py`)
- [x] Database connection pool optimization (pool_recycle for RDS)
- [x] Environment validation and configuration
- [x] Request timing and correlation IDs

### Phase 2 - Observability & Testing ✅ COMPLETE
- [x] **Sentry Integration** - Error tracking and alerting
- [x] **Automated Test Suite** - Tests run in CI/CD before deploy
- [x] **Request Timing Alerts** - Log slow requests (>1s)
- [x] **GDPR Compliance** - Data export/deletion endpoints

### Phase 3 - Scaling & Hardening
- [ ] **Redis Rate Limiting** - For horizontal scaling
- [ ] **Blue/Green Deployment** - Zero-downtime releases
- [ ] **Pre-deploy Smoke Tests** - Automated verification
- [ ] **Query Optimization** - N+1 detection, composite indexes
- [ ] **CSRF Protection** - Double-submit cookies

### Security Rotation Schedule

| Secret | Frequency | Method |
|--------|-----------|--------|
| SECRET_KEY | 90 days | `openssl rand -base64 32` |
| Database Password | 180 days | RDS console + .env |
| API Keys | On compromise | Provider dashboard |

---

## Embeddable Widgets

Site2CRM provides three embeddable widgets that customers add to their websites:

| Widget | Directory | Description |
|--------|-----------|-------------|
| **Form Widget** | `widget/form-widget/` | Lead capture forms with customizable fields and styles |
| **Chat Widget** | `widget/chat-widget/` | AI-powered chat that captures leads conversationally |
| **Booking Widget** | `widget/booking-widget/` | Calendar booking for scheduling meetings |

All widgets are served from the API (`/api/public/chat-widget/widget.js`, etc.) and embedded via a `<script>` tag with a `data-widget-key` attribute.

### Chat Widget Architecture
- **Source**: `widget/chat-widget/src/chat-widget.js` (vanilla JS IIFE)
- **Build**: `terser` minification → `widget/chat-widget/dist/chat-widget.min.js`
- **Features**: SPA-aware route detection, GTM/tag manager compatible, retry with backoff, configurable z-index, async font loading, duplicate prevention
- **Embed**: `<script src="https://api.site2crm.io/api/public/chat-widget/widget.js" data-widget-key="wgt_xxx" async></script>`
- **Options**: `data-exclude-paths` (comma-separated paths to hide on), `data-z-index` (custom z-index)

---

## Project Structure

```
site2crm/
├── app/                          # FastAPI backend
│   ├── api/routes/               # API endpoints
│   │   ├── auth.py               # JWT auth, login, logout
│   │   ├── billing.py            # Stripe checkout, webhooks
│   │   ├── orgs.py               # Signup, email verify, onboarding
│   │   ├── leads.py              # Lead CRUD + PATCH + notes
│   │   ├── crm.py                # CRM sync endpoints
│   │   ├── chat_widget.py        # Chat widget config + AI messages
│   │   ├── webhooks.py           # Webhook CRUD + delivery logs
│   │   └── oauth.py              # OAuth 2.0 provider for Zapier
│   ├── integrations/             # CRM API clients
│   │   ├── hubspot.py
│   │   ├── salesforce.py
│   │   ├── pipedrive.py
│   │   └── nutshell.py
│   ├── services/
│   │   └── webhook_service.py    # Webhook firing with HMAC signatures
│   ├── core/                     # Config, security, rate limiting
│   └── db/                       # SQLAlchemy models
├── slms-frontend/                # React SPA
│   └── src/
│       ├── pages/                # Dashboard, Settings, Billing
│       ├── components/           # Reusable UI
│       └── context/              # Auth, CRM providers
├── widget/                       # Embeddable widgets
│   ├── chat-widget/              # AI chat widget (vanilla JS)
│   │   ├── src/chat-widget.js    # Source
│   │   └── dist/chat-widget.min.js # Built (terser)
│   ├── form-widget/              # Lead capture form widget
│   └── booking-widget/           # Calendar booking widget
└── .github/workflows/            # CI/CD pipelines
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL (or SQLite for local dev)

### Backend
```bash
cd site2crm
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your environment
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd slms-frontend
npm install
npm run dev
```

### Widget
```bash
cd widget
npm install
npm run build
```

---

## Environment Variables

```bash
# Core
SECRET_KEY=your-jwt-secret
DATABASE_URL=postgresql://user:pass@host/db

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...

# CRM Integrations (per-org via UI)
# Users configure their own API keys in Settings

# Email (AWS SES)
EMAIL_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_SMTP_USERNAME=AKIA...
EMAIL_SMTP_PASSWORD=...
EMAIL_FROM_ADDRESS=noreply@site2crm.io

# CORS
FRONTEND_BASE_URL=https://site2crm.io
```

---

## CRM Integrations

| Provider | Auth Method | Sync Type | Status |
|----------|-------------|-----------|--------|
| HubSpot | API Key (PAT) | Real-time push | Active |
| Salesforce | OAuth 2.0 | Real-time push | Active |
| Pipedrive | API Key | Real-time push | Active |
| Nutshell | API Key | Real-time push | Active |

---

## API Documentation

- **Swagger UI**: [api.site2crm.io/docs](https://api.site2crm.io/docs)
- **ReDoc**: [api.site2crm.io/redoc](https://api.site2crm.io/redoc)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signup` | Create account |
| POST | `/api/token` | Login |
| GET | `/api/me` | Current user |
| POST | `/api/billing/checkout` | Start subscription |
| POST | `/api/billing/webhook` | Stripe events |
| GET | `/api/leads` | List leads |
| POST | `/api/leads` | Create lead |

---

## Deployment

### Backend (GitHub Actions → EC2)
```yaml
# On push to main:
- SSH to EC2
- git pull
- pip install
- alembic upgrade head
- systemctl restart site2crm
```

### Frontend (GitHub Actions → S3/CloudFront)
```yaml
# On push to main:
- npm run build
- aws s3 sync dist/ s3://bucket
- aws cloudfront create-invalidation
```

---

## Billing Plans

| Plan | Monthly | Annual | Features |
|------|---------|--------|----------|
| Starter | $29 | $290 | 500 leads/mo, 1 CRM |
| Pro | $79 | $790 | Unlimited leads, all CRMs, AI features |
| AppSumo Lifetime | $249 one-time | — | 1,000 leads/mo, 2 CRMs, 2 forms (lifetime access) |

### AppSumo Integration
Site2CRM is available on [AppSumo](https://appsumo.com) as a lifetime deal. AppSumo customers redeem codes at `/app/appsumo` and accept the Lifetime License Addendum. Codes are managed via admin endpoints (`/api/appsumo/admin/codes/*`).

---

## Maintained By

**Joshua R. Gutierrez**
Email: labs@axiondeep.com
Website: [site2crm.io](https://site2crm.io)

---

## License

Proprietary - All rights reserved.

Copyright (c) 2025-2026 Axion Deep Labs Inc. All rights reserved.
<!-- v1 -->
<!-- v2 -->

