# SLMS (Site2CRM) — Smart Lead Management System

A practical and modular CRM companion built for scalability, analytics, and AI-driven insights. Originally developed as **SLMS (Sales Lead Management System)**, now rebranded as **Site2CRM** for production deployment.

---

## ✅ Deployment Summary (as of 2025-10-27)

### Backend (FastAPI + PostgreSQL + AWS)
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL (AWS RDS)
- **Infra:** EC2 (Ubuntu 24.04) + Nginx + Gunicorn + Let's Encrypt TLS
- **App Path:** `main:app`
- **Domain:** `api-site2crm.axiondeep.com`
- **SSL:** Let's Encrypt, auto-renewed, HSTS enforced
- **Process Manager:** systemd service (`site2crm.service`) with restart on failure
- **Monitoring:** AWS CloudWatch alarm on EC2 health + SNS email alerts
- **Health Endpoint:** `/healthz` returns `{ "status": "ok" }`

### Frontend (React + Vite)
- **Repo path:** `slms/slms-frontend`
- **Prod API base:** `VITE_API_BASE=https://api-site2crm.axiondeep.com`
- **Build command:** `npm run build`
- **Output:** `dist/`
- **Deployment Target (planned):** S3 + CloudFront
- **Domain:** `site2crm.axiondeep.com`
- **Certificate:** AWS ACM (to be issued during CloudFront setup)

### DNS (Route 53)
| Subdomain | Type | Target | Purpose |
|------------|------|---------|----------|
| `api-site2crm.axiondeep.com` | A | `34.230.32.54` | Backend API |
| `site2crm.axiondeep.com` | Alias | CloudFront (TBD) | Frontend |

### IAM / Security
- IAM user: `aws-admin-site2crm` (AdministratorAccess during setup)
- Security groups: isolated `site2crm-backend-sg` + `site2crm-db-sg`
- SSH restricted to admin IP only
- No public RDS access (EC2-only connectivity)

### Logging & Uptime
- Logs: `/var/log/site2crm/`
- Service logs: `journalctl -u site2crm.service`
- Nginx logs: `/var/log/nginx/`
- Monitoring: EC2 status alarm → SNS → email alert

---

## 🚀 Next Steps

1. **Frontend Deployment:**
   - Create private S3 bucket `site2crm-frontend-prod` in `us-east-1`
   - Upload `dist/` build via `aws s3 sync dist s3://site2crm-frontend-prod`
   - Create CloudFront distribution
   - Attach ACM certificate for `site2crm.axiondeep.com`
   - Point Route 53 `A/ALIAS` record to CloudFront

2. **CI/CD (Optional):**
   - Add GitHub Actions for build + S3 sync + cache invalidation

3. **Cost Optimization:**
   - Use t3.micro EC2 + RDS micro-tier (covered by free tier)
   - Monitor network egress (CloudFront cache reduces cost)

---

### SLMS — Development and Local Environment for Testing

A practical stack for capturing leads, syncing with your CRM, and turning activity into useful analytics. Start simple (public lead capture + salesperson stats), then add lead analytics and ML-driven scoring/coaching. HubSpot works today; Pipedrive, Nutshell, and Salesforce are on the roadmap.

---

### Why the frontend matters

The frontend is not an afterthought. It is where teams see the numbers and act:
- A clean dashboard for lead and salesperson analytics.
- A test page and embeddable widget to capture leads directly from your site.
- A foundation for future tools: drag-and-drop widget builder, funnel views, and AI insights.
Keep the frontend running in dev as you wire new endpoints—feedback is immediate.

---

### Quick start

#### Backend
```bash
python -m venv venv
# Windows: .\venv\Scripts\activate    # mac/linux: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

#### Frontend
```bash
cd slms-frontend
npm install
npm run dev
```

---

### Environment

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/slms_local
CRM_PROVIDER=hubspot
HUBSPOT_API_KEY=pat-na1-...your-token...
```

### CRM Support
- **Today:** HubSpot with Private App token.
- **Next:** Pipedrive, Nutshell CRM, Salesforce.

### Lead Capture Example
```html
<form action="http://127.0.0.1:8000/public/leads" method="post">
  <input type="email" name="email" placeholder="Email" required />
  <input type="text" name="name" placeholder="Full name" />
  <button type="submit">Contact me</button>
</form>
```

### Analytics
- **Implemented:** Salesperson analytics via HubSpot
- **Roadmap:** Lead analytics, funnels, and AI-driven coaching

### AI/ML (Roadmap)
- Lead scoring & sales insights
- Weekly summaries and predictive modeling

---

### Project structure

```text
app/
  api/
  integrations/
  schemas/
slms-frontend/
  src/
  components/
```

---

### Notes
- Backend reads `.env` on startup.
- Keep API tokens out of commits.
- Restart the API after modifying environment variables.

---

_Last updated: 2025-10-27 (Deployment Checkpoint + Original Documentation Preserved)_