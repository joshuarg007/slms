# SLMS — Sales Lead Management System

A practical stack for capturing leads, syncing with your CRM, and turning activity into useful analytics. Start simple (public lead capture + salesperson stats), then add lead analytics and ML-driven scoring/coaching. HubSpot works today; Pipedrive, Nutshell, and Salesforce are on the roadmap.

---

## Why the frontend matters

The frontend is not an afterthought. It is where teams see the numbers and act:
- A clean dashboard for lead and salesperson analytics.
- A test page and embeddable widget to capture leads directly from your site.
- A foundation for future tools: drag‑and‑drop widget builder, funnel views, and AI insights.
Keep the frontend running in dev as you wire new endpoints—feedback is immediate.

---

## Quick start

### Backend
```bash
python -m venv venv
# Windows: .\venv\Scripts\activate    # mac/linux: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Frontend (recommended to run alongside the API)
```bash
cd slms-frontend
npm install
# optional: point to your API
#   echo VITE_API_URL=http://127.0.0.1:8000 > .env.local
npm run dev
```

---

## Environment

Create `.env` in the repo root:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/slms_local

# CRM provider
CRM_PROVIDER=hubspot   # hubspot | pipedrive | nutshell | salesforce

# HubSpot (current adapter)
HUBSPOT_API_KEY=pat-na1-...your-token...
```

### HubSpot scopes (current adapter)

**Required**
- crm.objects.owners.read
- crm.objects.contacts.write
- crm.objects.deals.read

**Optional (recommended)**
- crm.objects.contacts.read        # upsert search by email
- crm.objects.deals.write          # seed test deals from scripts
- crm.objects.appointments.read    # meetings where supported

Restart the API after changing tokens or scopes.

---

## CRM support

- **Today:** HubSpot with Private App token.
- **Next:** Pipedrive, Nutshell CRM, Salesforce via pluggable adapters.
- Design: provider modules behind a single interface (`list_owners`, `upsert_contact`, `search_deals`, etc.). Switch providers via `CRM_PROVIDER` without touching routes.

---

## Lead capture

### Embeddable widget (implemented)
Use the widget to POST to `/public/leads`. You can also post JSON directly from any form.

Minimal HTML example:
```html
<form action="http://127.0.0.1:8000/public/leads" method="post">
  <input type="email" name="email" placeholder="Email" required />
  <input type="text"  name="name"  placeholder="Full name" />
  <input type="text"  name="phone" placeholder="Phone" />
  <input type="text"  name="company" placeholder="Company" />
  <button type="submit">Contact me</button>
</form>
```

API behavior: creates or updates a contact in the active CRM and returns `{ status: ok | updated | exists, crm_contact_id, email }`.

### Drag‑and‑drop builder (roadmap)
Visual builder to compose fields, generate an embed snippet, and track conversions per widget. Hosted script option with `data-*` attributes for source and organization.

---

## Analytics

### Salesperson analytics (implemented)
Endpoints:
- `GET /integrations/hubspot/salespeople/stats?days=7&owner_id=...&owner_email=...`
- `GET /integrations/hubspot/salespeople/owners`
- `GET /integrations/hubspot/salespeople/health`
- `GET /integrations/hubspot/salespeople/raw`
- `GET /integrations/hubspot/salespeople/debug/deals?owner_id=...&days=...`

Notes:
- New deals are counted by created date; owner is filtered in code (reliable on fresh portals).
- Meetings come from Appointments where available; emails/calls appear when the portal exposes those objects.

### Lead analytics (roadmap)
- Capture rate by source/campaign and over time.
- Form performance (views → submits → valid contacts).
- Funnel from lead to deal with stage breakdowns.
- Team and individual drill‑downs.

---

## AI/ML (roadmap)

**For leads**
- Lead scoring using recency, source quality, and prior conversions.
- Weekly summaries and report generation (PDF/HTML).

**For salesperson stats**
- Activity quality scores by rep (weights emails/calls/meetings with recency and outcomes).
- Pipeline health, anomalies, and coaching tips (next best actions).

Draft APIs:
- `POST /ai/score-lead`
- `GET /reports/weekly?org_id=...`
- `GET /analytics/salespeople/insights?org_id=...`

---

## Project structure (high level)

```text
app/
  api/
    routes/            # FastAPI routers (stats, public leads, debug)
  integrations/
    hubspot.py         # current CRM adapter
    # pipedrive.py, nutshell.py, salesforce.py  (planned adapters)
  schemas/
    lead.py            # public/internal lead payloads
    salesperson.py     # stats response models

slms-frontend/
  public/
    test_widget.html
    vite.svg
  src/
    assets/
    components/
      AppLayout.tsx
      DashboardCharts.tsx
      ErrorBoundary.tsx
      Navbar.tsx
      PrivateRoute.tsx
      ProtectedRoute.tsx
    hooks/
      useDashboardMetrics.ts
    pages/
      DashboardPage.tsx
      LeadsPage.tsx
      LoginPage.tsx
      SignupPage.tsx
      WidgetTestPage.tsx
    utils/
      api.ts
      auth.ts
    App.tsx
    index.css
    main.tsx
    vite-env.d.ts
  index.html
  package.json
```

Keep the tree shallow in the README (2–3 levels) so it stays readable.

---

## Quick checks (PowerShell)

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
- Current implementation targets HubSpot; adapters make Pipedrive/Nutshell/Salesforce straightforward.
- When engagement objects aren’t exposed in a portal, related counts return zero without errors.
- The backend reads `.env` on startup; restart after changing it.
- Keep tokens out of logs and commits.

---

_Last updated: 2025-08-27_
