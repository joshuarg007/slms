# SLMS — Sales Lead Management System

A small, pragmatic stack for capturing leads, syncing to HubSpot, and getting usable analytics. The goal is to start simple (public lead capture + salesperson stats) and grow into deeper lead analytics and ML-driven scoring/reporting.

---

## What you get

**Today**
- Lead capture API (`/public/leads`) that creates or updates a HubSpot contact.
- Salesperson analytics: owners, health checks, and per-owner rollups (emails, calls, meetings, new deals).
- Debug helpers to see the exact deal rows that feed the metrics.
- Minimal, embeddable lead widget (static form) with a path to a drag‑and‑drop builder.

**Next (planned)**
- Drag‑and‑drop form builder to create brand‑consistent lead widgets without code.
- Lead analytics (trends, conversion by source/campaign, funnel views).
- AI/ML scoring of leads, weekly summaries, and report generation by organization.
- Scheduled jobs for daily refresh and weekly digests.
- Admin UI for orgs, sources, and widget management.

---

## Architecture (short version)

- **Backend**: FastAPI (Python), Pydantic models, Alembic for migrations.
- **Integrations**: HubSpot Private App token for owners, contacts, deals, and (optionally) appointments.
- **Frontend**: React/Vite app (dashboard + simple embed widget).
- **Database**: Postgres (local + prod). Current HubSpot slice is read‑heavy and does not write to DB.
- **AI/ML (planned)**: background worker to score leads, build weekly summaries, and render reports (PDF/HTML).

---

## Setup

### Requirements
- Python 3.11+
- Node 18+ (for the frontend/dashboard)
- Postgres 14+
- HubSpot Private App token

### Environment
Create a `.env` in the repo root:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/slms_local

# HubSpot private app token
HUBSPOT_API_KEY=pat-na1-...your-token...
```

### HubSpot scopes

**Required**
- crm.objects.owners.read
- crm.objects.contacts.write
- crm.objects.deals.read

**Optional (recommended)**
- crm.objects.contacts.read        # upsert searches by email
- crm.objects.deals.write          # seed test deals from scripts
- crm.objects.appointments.read    # meetings via Appointments where supported

Restart the API after changing scopes or tokens.

---

## Run it

### Backend
```bash
python -m venv venv
# Windows: .\venv\Scripts\activate    # mac/linux: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Frontend (dashboard + basic embed)
```bash
cd slms-frontend
npm i
# optional API override:
#   echo VITE_API_URL=http://127.0.0.1:8000 > .env.local
npm run dev
```

---

## Lead capture

### Public API (implemented)
`POST /public/leads` — creates or updates a HubSpot contact.

Body (send what you have):
```json
{
  "email": "alex@example.com",
  "name": "Alex Example",
  "first_name": "Alex",
  "last_name": "Example",
  "phone": "555-0100",
  "company": "Acme"
}
```

Response:
```json
{ "status": "ok | updated | exists", "hubspot_contact_id": "123456", "email": "alex@example.com" }
```

### Embeddable widget (basic, implemented)
You can render a minimal form that POSTs to `/public/leads` from any site:

```html
<form action="http://127.0.0.1:8000/public/leads" method="post">
  <input type="email" name="email" placeholder="Email" required />
  <input type="text"  name="name"  placeholder="Full name" />
  <input type="text"  name="phone" placeholder="Phone" />
  <input type="text"  name="company" placeholder="Company" />
  <button type="submit">Contact me</button>
</form>
```

If you prefer XHR/Fetch, post JSON to the same URL.

### Drag‑and‑drop builder (planned)
- Visual builder to assemble fields, copy an embed snippet, and track conversions per widget.
- Hosted script: `<script src="https://cdn.yoursite/widget.js" data-endpoint="..."></script>`
- Auto‑append `source`, `organization_id`, and campaign params in the background.

---

## Salesperson analytics (implemented)

**Endpoints**
- `GET /integrations/hubspot/salespeople/stats?days=7&owner_id=...&owner_email=...`
- `GET /integrations/hubspot/salespeople/owners`
- `GET /integrations/hubspot/salespeople/health`
- `GET /integrations/hubspot/salespeople/raw`
- `GET /integrations/hubspot/salespeople/debug/deals?owner_id=...&days=...`

**How it works**
- New deals are counted by created date; owner is filtered in code (resilient on fresh portals).
- Meetings come from the `appointments` object when available; otherwise remain zero.
- Emails and calls are included when the portal exposes those engagement objects.

---

## Lead analytics (planned)

**Goals**
- Capture rate over time, by source and campaign.
- Form performance per widget (views → submits → valid contacts).
- Funnel views from lead to deal with stage breakdowns.
- Team and individual drill‑downs.

**Data**
- Mix of HubSpot reads + local aggregates (Postgres).
- Daily job to snapshot metrics for fast dashboards.

---

## AI/ML backend (planned)

**Lead scoring**
- Lightweight model using recency, source quality, and prior conversions.
- Expose a score on each lead; add filters in analytics.

**Summaries & reports**
- Weekly per‑org email with highlights, outliers, and rep activity.
- One‑click export to PDF/HTML for stakeholders.

**APIs (draft)**
- `POST /ai/score-lead` — return a score and reasons.
- `GET /reports/weekly?org_id=...` — prebuilt weekly summary (HTML/PDF).

---

## Project layout

```
app/
  api/
    routes/            # FastAPI routers (hubspot stats, public leads, debug)
  integrations/
    hubspot.py         # HubSpot client and helpers
  schemas/
    lead.py            # Lead payloads (public + internal)
    salesperson.py     # Stats response models
slms-frontend/
  ...                  # React/Vite app (dashboard + basic embed)
```

---

## Quick checks (PowerShell examples)

```powershell
$base = "http://127.0.0.1:8000"

# health + owners
(Invoke-WebRequest -Uri "$base/integrations/hubspot/salespeople/health").Content | ConvertFrom-Json | Format-List
(Invoke-WebRequest -Uri "$base/integrations/hubspot/salespeople/owners").Content  | ConvertFrom-Json | Format-Table id,email -AutoSize

# stats
(Invoke-WebRequest -Uri "$base/integrations/hubspot/salespeople/stats?days=90" -Method GET).Content |
  ConvertFrom-Json | Select-Object -ExpandProperty results |
  Format-Table owner_id,owner_name,new_deals_last_n_days -AutoSize

# public lead upsert
$body = @{ email="test@example.com"; name="Test User"; phone="555-0100"; company="Acme" } | ConvertTo-Json
(Invoke-WebRequest -Uri "$base/public/leads" -Method POST -ContentType "application/json" -Body $body).Content |
  ConvertFrom-Json | Format-List
```

---

## Notes
- This slice is HubSpot‑first. When engagement objects aren’t exposed in a portal, related counts return zero without errors.
- The backend reads `.env` on startup; restart after changing it.
- Keep tokens out of logs and commits.

---

_last updated 2025-08-27_
