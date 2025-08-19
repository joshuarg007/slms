# SLMS — Multi‑Tenant Leads Management

FastAPI + React/Vite reference implementation for a small, **multi‑tenant** leads system.

- **Tenancy**: Every User and Lead belongs to an **Organization**. All reads & writes are scoped.
- **Public intake**: 3rd‑party forms can create leads via `/public/leads` using an **org API key**.
- **Auth**: Cookie + **Bearer** hybrid. SPA stores `access_token` and auto‑refreshes on 401.
- **DB**: SQLite by default (Postgres recommended for prod). Alembic migrations included.

---

## Contents

- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Backend (FastAPI)](#backend-fastapi)
  - [Environment variables](#environment-variables)
  - [Run locally](#run-locally)
  - [Database & Alembic](#database--alembic)
  - [API endpoints](#api-endpoints)
  - [cURL recipes](#curl-recipes)
- [Frontend (React/Vite)](#frontend-reactvite)
  - [Dev server](#dev-server)
  - [Routing & guards](#routing--guards)
  - [API helper](#api-helper)
- [Tenancy model](#tenancy-model)
- [Troubleshooting](#troubleshooting)
- [Production notes](#production-notes)

---

## Architecture

```
/ (repo root)
├─ slms/                 # FastAPI backend (this may be your current root)
│  ├─ main.py            # App entrypoint (cookie+Bearer auth, routes)
│  ├─ app/db/models.py   # SQLAlchemy models (Lead, User, Organization)
│  ├─ app/db/session.py  # Session/engine glue
│  ├─ alembic/           # Migrations (SQLite-safe)
│  └─ ...
└─ slms-frontend/        # React + Vite + Tailwind
   ├─ src/
   │  ├─ App.tsx
   │  ├─ main.tsx
   │  ├─ utils/api.ts              # Bearer + refresh-on-401 helper
   │  ├─ components/ProtectedRoute.tsx
   │  ├─ components/AppLayout.tsx
   │  ├─ components/Navbar.tsx
   │  └─ pages/
   │     ├─ LoginPage.tsx
   │     ├─ SignupPage.tsx
   │     ├─ DashboardPage.tsx
   │     └─ LeadsPage.tsx
   ├─ vite.config.ts               # @ alias → src
   ├─ tsconfig.json                # paths config for alias
   └─ index.html / index.css
```

---

## Quick start

### 1) Backend
```bash
# from: slms/  (or your backend folder)
python -m venv venv
./venv/Scripts/activate          # (Windows)  OR  source venv/bin/activate (mac/linux)

pip install -r requirements.txt  # or: pip install fastapi uvicorn alembic sqlalchemy passlib[bcrypt] python-jose

# env (optional; see below). For dev SQLite is fine.
set SECRET_KEY=dev-secret-change-me

alembic upgrade head
uvicorn main:app --reload --port 8000
```

### 2) Frontend
```bash
# from: slms-frontend/
npm i
# point the SPA to the API (defaults to http://127.0.0.1:8000 if not set)
# echo VITE_API_URL=http://127.0.0.1:8000 > .env.local   # optional
npm run dev
```

Open: http://localhost:5173

---

## Backend (FastAPI)

### Environment variables

| Name           | Default                 | Notes                                           |
|----------------|-------------------------|-------------------------------------------------|
| `SECRET_KEY`   | `dev-secret-change-me`  | HMAC for JWTs (access & refresh). Replace in prod. |
| `DATABASE_URL` | `sqlite:///./test.db`   | Use Postgres in prod: `postgresql+psycopg://...` |
| `CORS_ORIGINS` | `http://localhost:5173` | Configured directly in `main.py` for dev.       |

### Run locally

```bash
uvicorn main:app --reload --port 8000
# OpenAPI: http://127.0.0.1:8000/openapi.json
# Docs:    http://127.0.0.1:8000/docs
```

### Database & Alembic

The schema includes Organizations and FKs on Users and Leads. Migrations are **SQLite‑safe**.

```bash
# upgrade to latest
alembic upgrade head

# create a new migration after model changes
alembic revision -m "your message"
alembic upgrade head
```

### API endpoints

**Auth & user**
- `POST /signup` — create user; assigns **Organization** by email domain (creates org if needed).
- `POST /token` — login (form‑encoded). Returns JSON `{ access_token, token_type }` and sets cookies.
- `POST /token/refresh` — issues a **new access token** and sets cookies; returns `{ access_token, token_type }`.
- `POST /logout` — clears cookies.
- `GET /me` — returns `{ email }` for the current user.

**Tenancy & data**
- `GET /leads` — list leads **for your organization**. Supports `q`, `sort`, `dir`, `page`, `page_size`.
- `GET /dashboard/metrics` — simple org‑scoped metrics.
- `POST /orgs/key/rotate` — rotate and return your org’s **API key**.

**Public intake**
- `POST /public/leads` — create a lead for an org using header `X-Org-Key: <api_key>`. Server sets `organization_id`, ignoring any client attempt.

### cURL recipes

```bash
API=http://127.0.0.1:8000

# Signup
curl -X POST "$API/signup" -H "Content-Type: application/json" \
  -d '{"email":"alice@acme.com","password":"secret"}'

# Login (saves cookies + returns access_token; both are supported)
curl -c cookies.txt -b cookies.txt -X POST "$API/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=alice@acme.com" \
  --data-urlencode "password=secret"

# Rotate org key (requires auth; uses cookies)
curl -b cookies.txt -X POST "$API/orgs/key/rotate"

# Create public lead (copy api_key from rotate response)
curl -X POST "$API/public/leads" -H "Content-Type: application/json" \
  -H "X-Org-Key: <api_key>" \
  -d '{"email":"demo.lead@example.com","name":"Demo Lead","source":"web"}'

# List org leads (using Bearer from /token)
TOKEN="<paste access_token>"
curl -H "Authorization: Bearer $TOKEN" "$API/leads"
```

---

## Frontend (React/Vite)

### Dev server

```bash
cd slms-frontend
npm i
npm run dev
# open http://localhost:5173
# ensure VITE_API_URL matches your API if not default
```

**Path alias**: `@` → `src` (configured in `vite.config.ts` + `tsconfig.json`).

### Routing & guards

- `ProtectedRoute` checks `/me` using the stored Bearer token.
- Private routes are wrapped with `ProtectedRoute` and a simple `AppLayout` (Navbar w/ Sign out).

### API helper

`src/utils/api.ts`:
- Stores `access_token` (localStorage) and sends `Authorization: Bearer ...` on every request.
- On **401**, calls `/token/refresh`, updates the Bearer token, and **retries once**.
- Exposes helpers: `login`, `logout`, `me`, `getLeads`, `getDashboardMetrics`, `createPublicLead`, `refresh`.

---

## Tenancy model

- `Organization` (name, domain, **api_key**)
- `User.organization_id` (FK). **Login never changes org.**
- `Lead.organization_id` (FK). All `/leads` queries are **org‑scoped**.
- `/public/leads` requires `X-Org-Key`. The server **overwrites** `organization_id` to the key owner.

**Result:** no cross‑org read or write is possible from the client.

---

## Troubleshooting

- **White/blank page**: make sure `src/main.tsx` imports `./index.css` and that your routes render.
- **Stuck on login page**: check `ProtectedRoute` can call `/me`, and that `api.login()` stored a token.
- **401 Not authenticated**: the SPA will refresh once automatically. If it persists, verify cookies are allowed for your dev origin and that `VITE_API_URL` points to the backend.
- **“/token not found”**: ensure the `POST /token` route exists in `main.py` and the server was restarted.
- **SQLite alter constraint errors**: migrations are batch‑mode/SQLite‑safe. If you wrote new ones, use Alembic batch ops for SQLite.

---

## Production notes

- Use **HTTPS** and set cookies `secure=True` in `main.py`.
- Replace `SECRET_KEY` and switch to **Postgres** (`DATABASE_URL`).
- Restrict **CORS** origins to your frontend domain(s).
- Rotate org **api_key** from an admin‑only screen; never log or expose it elsewhere.
- Consider rate limiting on `/public/leads` per API key and background delivery to CRMs.

---

## License

Private/internal project. Add your own license if you plan to distribute.
