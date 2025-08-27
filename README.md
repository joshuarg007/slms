# SLMS — Multi‑Tenant Lead Management

FastAPI backend with a minimal React/Vite frontend for a small multi‑tenant lead system. 
Local setup is quick; production uses Postgres. HubSpot integration is included for 
salesperson stats and public lead intake.

---

## What’s here
- FastAPI app (`uvicorn`) with Pydantic models and Alembic migrations
- HubSpot integration (owners, deals, basic engagement counts)
- Public lead **upsert** endpoint (creates or updates contact in HubSpot)
- Health/owners/debug endpoints to sanity‑check tokens and scopes

## Requirements
- Python 3.11+
- Node 18+ (if running the optional frontend)
- Postgres 14+ (for local/prod DB)
- A HubSpot **Private App** token with scopes listed below

## Environment
Create `.env` in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/slms_local

# HubSpot private app token
HUBSPOT_API_KEY=pat-na1-...your-token...
```

## Install & run (backend)
```bash
python -m venv venv
# Windows: .\venv\Scripts\activate    # mac/linux: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

## (Optional) Frontend
```bash
cd slms-frontend
npm i
# set API URL if needed:
#   echo VITE_API_URL=http://127.0.0.1:8000 > .env.local
npm run dev
```

## HubSpot setup
Private App → Scopes (minimum):
- crm.objects.owners.read
- crm.objects.contacts.write
- crm.objects.deals.read

Nice to have:
- crm.objects.contacts.read (upsert search by email)
- crm.objects.deals.write (seed test deals from scripts)
- crm.objects.appointments.read (meetings via Appointments where supported)

Restart the API after changing scopes or tokens.

## Key endpoints

**Salesperson stats**
- `GET /integrations/hubspot/salespeople/stats?days=7&owner_id=...&owner_email=...`
  - returns per‑owner rollups: emails, calls, meetings, new deals
- `GET /integrations/hubspot/salespeople/owners`
- `GET /integrations/hubspot/salespeople/health`
- `GET /integrations/hubspot/salespeople/debug/deals?owner_id=...&days=...`

**Public intake**
- `POST /public/leads`
  - Body (any subset): `email`, `name`, `first_name`, `last_name`, `phone`, `company`
  - Behavior: create or update HubSpot contact; returns `ok | updated | exists`

## Quick tests (PowerShell)

**Owners / health**
```powershell
$base = "http://127.0.0.1:8000"
(Invoke-WebRequest -Uri "$base/integrations/hubspot/salespeople/health").Content | ConvertFrom-Json | Format-List
(Invoke-WebRequest -Uri "$base/integrations/hubspot/salespeople/owners").Content  | ConvertFrom-Json | Format-Table id,email -AutoSize
```

**Stats**
```powershell
(Invoke-WebRequest -Uri "$base/integrations/hubspot/salespeople/stats?days=90" -Method GET).Content |
  ConvertFrom-Json | Select-Object -ExpandProperty results |
  Format-Table owner_id,owner_name,new_deals_last_n_days -AutoSize
```

**Public lead upsert**
```powershell
$body = @{ email="test@example.com"; name="Test User"; phone="555-0100"; company="Acme" } | ConvertTo-Json
(Invoke-WebRequest -Uri "$base/public/leads" -Method POST -ContentType "application/json" -Body $body).Content |
  ConvertFrom-Json | Format-List
```

## Notes
- Meetings come from Appointments where available; if not, counts remain zero.
- Deals are counted by created date; owner is filtered in code to tolerate fresh‑index delays.
- The backend reads `.env` on startup; restart after changing it.

---

Condensed README generated on 2025-08-27. Based on the original project README.
