# SLMS — Sales Lead Management System

A pragmatic stack for capturing leads, syncing with your CRM, and turning activity into useful analytics. It starts simple (public lead capture + salesperson stats) and grows into lead analytics and ML‑driven scoring/coaching.

> **CRM support**
> - **Today:** HubSpot (private app token)
> - **Next:** Pipedrive, Nutshell CRM, Salesforce
> - Design: provider adapters behind a single interface (owners, contacts upsert, deals search). Switch providers via config without touching the app routes.

---

## What you get

**Today**
- Lead capture API (`/public/leads`) that creates or updates a contact in the connected CRM (HubSpot now).
- Salesperson analytics: owners, health checks, and per‑owner rollups (emails, calls, meetings, new deals).
- Debug helpers to see the exact deal rows feeding the metrics.
- Minimal, embeddable lead widget (static form) with a path to a drag‑and‑drop builder.

**Next (planned)**
- Drag‑and‑drop form builder to ship brand‑consistent widgets without code.
- Lead analytics (trends, conversion by source/campaign, funnel views).
- **AI/ML for leads and reps:** lead scoring, weekly summaries, rep activity quality, pipeline health, anomaly detection, coaching tips.
- Scheduled jobs for daily refresh and weekly digests.
- Admin UI for orgs, sources, and widget management.
- **Multi‑CRM adapters:** Pipedrive/Nutshell/Salesforce implementations of the same interface.

---

## Architecture (short version)

- **Backend:** FastAPI (Python), Pydantic models, Alembic migrations.
- **CRM adapters:** `hubspot` (now), `pipedrive` / `nutshell` / `salesforce` (planned) behind a common interface:
  - `list_owners()`, `upsert_contact()`, `search_deals(created_since=…, owner=…)`, `count_activity(kind=…)`
- **Frontend:** React/Vite app (dashboard + simple embed widget).
- **Database:** Postgres for local/prod analytics snapshots. Current slice reads directly from CRM.
- **AI/ML (planned):** background worker for lead/revenue models, salesperson insights, summaries, report generation (PDF/HTML).

---

## Setup

### Requirements
- Python 3.11+
- Node 18+ (frontend/dashboard)
- Postgres 14+
- CRM credentials (HubSpot now; others later)

### Environment
Create `.env` in the repo root. The provider switch is explicit:

```env
# Core
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/slms_local

# CRM provider selection
CRM_PROVIDER=hubspot   # hubspot | pipedrive | nutshell | salesforce

# HubSpot (current implementation)
HUBSPOT_API_KEY=pat-na1-...your-token...
```

### HubSpot scopes (for the current adapter)

**Required**
- crm.objects.owners.read
- crm.objects.contacts.write
- crm.objects.deals.read

**Optional (recommended)**
- crm.objects.contacts.read        # upsert search by email
- crm.objects.deals.write          # seed test deals from scripts
- crm.objects.appointments.read    # meetings via Appointments where supported

Restart the API after changing tokens or scopes.

> **Future providers**
> - **Pipedrive:** personal API token; permissions for deals, persons, activities.
> - **Nutshell:** API key/secret; permissions for leads/contacts/activities.
> - **Salesforce:** OAuth connected app; scopes for users, contacts/leads, opportunities, events/tasks.

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
`POST /public/leads` — creates or updates a contact in the active CRM adapter.

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
{ "status": "ok | updated | exists", "crm_contact_id": "123456", "email": "alex@example.com" }
```

### Embeddable widget (basic, implemented)
A minimal form that POSTs to `/public/leads` from any site:

```html
<form action="http://127.0.0.1:8000/public/leads" method="post">
  <input type="email" name="email" placeholder="Email" required />
  <input type="text"  name="name"  placeholder="Full name" />
  <input type="text"  name="phone" placeholder="Phone" />
  <input type="text"  name="company" placeholder="Company" />
  <button type="submit">Contact me</button>
</form>
```

XHR/Fetch with JSON works too.

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

**How it works (current adapter)**
- New deals are counted by created date; owner is filtered in code (resilient on fresh portals).
- Meetings come from the `appointments` object when available; otherwise remain zero.
- Emails and calls are included when the portal exposes those engagement objects.

**AI for salesperson stats (planned)**
- **Activity quality score** per rep (weights emails/calls/meetings by recency, reply rates, and deal impact).
- **Pipeline health** (stale deals, unusual stage time, sandbag/risk flags).
- **Anomalies** (sudden drops vs historical baselines).
- **Coaching tips** (next best actions by rep/account).

---

## Lead analytics (planned)

**Goals**
- Capture rate over time, by source and campaign.
- Form performance per widget (views → submits → valid contacts).
- Funnel views from lead to deal with stage breakdowns.
- Team and individual drill‑downs.

**Data**
- Mix of CRM reads + local aggregates (Postgres).
- Daily job to snapshot metrics for fast dashboards.

**AI for leads (planned)**
- **Lead scoring** using recency, source quality, and prior conversions.
- **Summaries & reports** with highlights, outliers, and prioritized actions.
- Export weekly reports to PDF/HTML.

---

## API sketch (AI/Reports — planned)

- `POST /ai/score-lead` — return a score and reasons.
- `GET /reports/weekly?org_id=...` — prebuilt weekly summary (HTML/PDF).
- `GET /analytics/salespeople/insights?org_id=...` — rep insights and coaching prompts.

---

## Project layout

```
app/
  api/
    routes/            # FastAPI routers (stats, public leads, debug)
  integrations/
    hubspot.py         # current CRM adapter
    # pipedrive.py, nutshell.py, salesforce.py  (planned)
  schemas/
    lead.py            # public/internal lead payloads
    salesperson.py     # stats response models
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
- Current implementation targets HubSpot; the adapter interface makes it straightforward to add Pipedrive/Nutshell/Salesforce.
- When engagement objects aren’t exposed in a portal, related counts return zero without errors.
- The backend reads `.env` on startup; restart after changing it.
- Keep tokens out of logs and commits.

---

_last updated: 2025-08-27
