# SLMS (Site2CRM)

Multi-tenant SaaS backend for lead management and CRM integration. Production branding: **Site2CRM** (api.site2crm.io).

## Maintained By

Joshua R. Gutierrez
Email: joshua.g@site2crm.io

## Overview

SLMS is a comprehensive lead management system featuring:
- Multi-tenant architecture with organization-scoped data
- CRM integrations (HubSpot, Pipedrive, Salesforce, Nutshell)
- Secure JWT authentication with cookie-based tokens
- Embeddable lead capture widgets
- Stripe billing integration
- Automated email notifications via AWS SES

## Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | FastAPI 0.115.14 (Python async) |
| Server | Uvicorn 0.35.0 |
| Database | SQLite (dev), PostgreSQL (prod-ready) |
| ORM | SQLAlchemy 2.0.41 |
| Migrations | Alembic 1.16.2 |
| Auth | JWT (python-jose), Bcrypt (passlib) |
| Billing | Stripe 6.7.0 |
| HTTP Client | httpx (async) |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 19.1.0 + TypeScript 5.8.3 |
| Build | Vite 7.0.4 |
| Styling | Tailwind CSS 3.4.3 |
| Routing | React Router DOM 7.7.0 |
| Charts | Plotly.js 3.0.3 |

### Infrastructure
| Component | Service |
|-----------|---------|
| Compute | Ubuntu EC2 + Nginx + Systemd |
| Frontend | AWS S3 + CloudFront |
| Email | AWS SES |
| CI/CD | GitHub Actions |

## Project Structure

```
slms/
├── app/                          # FastAPI backend
│   ├── api/routes/               # API endpoints
│   ├── crud/                     # Database operations
│   ├── db/                       # Models & session
│   ├── integrations/             # CRM API clients
│   ├── schemas/                  # Pydantic models
│   ├── services/                 # Business logic
│   └── core/                     # Config, security, rate limiting
├── slms-frontend/                # React frontend
│   ├── src/
│   │   ├── pages/                # Page components
│   │   ├── components/           # UI components
│   │   ├── context/              # Auth, CRM context
│   │   └── utils/                # API client, helpers
├── widget/                       # Embeddable form widget
├── alembic/                      # Database migrations
└── .github/workflows/            # CI/CD pipelines
```

## Getting Started

### Backend Setup
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd slms-frontend
npm install
npm run dev
```

### Widget Build
```bash
cd widget
npm install
npm run build
```

## Environment Variables

Key settings (see `app/core/config.py`):
- `SECRET_KEY` - JWT signing key
- `DATABASE_URL` - Database connection string
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `EMAIL_*` - AWS SES configuration
- `RECAPTCHA_SECRET_KEY` - reCAPTCHA v3 backend key
- `ALLOWED_ORIGINS` - CORS origins (comma-separated)

## CRM Integrations

| Provider   | Auth Type | Status |
|------------|-----------|--------|
| HubSpot    | PAT       | Active |
| Pipedrive  | API Key   | Active |
| Salesforce | OAuth     | Active |
| Nutshell   | API Key   | Active |

## API Documentation

Auto-generated documentation available at:
- `/docs` - Swagger UI
- `/redoc` - ReDoc

## Deployment

### Backend
Triggered on push to `main` via GitHub Actions:
- Git pull → pip install → alembic upgrade → systemctl restart

### Frontend
Triggered on push to `main`:
- npm build → S3 sync → CloudFront invalidation

## License

Proprietary - All rights reserved.
