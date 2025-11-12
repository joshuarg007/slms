# Site2CRM — Deployment, Dev, and Operations Guide (2025-11-12)

> **Status:** Frontend CI/CD live (S3 + CloudFront). Backend CI/CD via GitHub Actions → AWS SSM. WAF in monitor mode.  
> **Audience:** Engineers (Windows dev), DevOps, and anyone deploying/running Site2CRM.

---

## 1) Architecture Overview

**Backend**
- **Framework:** FastAPI (Python 3.12)
- **Server:** Gunicorn (`uvicorn.workers.UvicornWorker`, 3 workers)
- **Host:** AWS EC2 (Ubuntu 22.04)
- **Reverse Proxy:** Nginx
- **Auth:** JWT (access/refresh), cookie-friendly
- **DB:** PostgreSQL (local dev + RDS-ready)
- **Migrations:** SQLAlchemy + Alembic
- **Integrations:** HubSpot, Salesforce, Pipedrive, Stripe Billing (planned/ongoing)
- **App directory (EC2):** `/home/ubuntu/site2crm`
- **Python venv (EC2):** `/opt/site2crm/.venv`

**Frontend**
- **Stack:** React + Vite (TypeScript)
- **Repo path:** `slms-frontend/`
- **Prod API base:** `https://api.site2crm.io` (via `VITE_API_URL`)
- **CDN:** CloudFront (same distribution for apex `site2crm.io`), **Distribution ID:** `E1T0ATNKXI2NS`
- **Static hosting:** S3 bucket `site2crm-frontend-prod` (us-east-1)

**Networking & Edge**
- **Domains (Route 53, hosted zone `site2crm.io`)**
  - `site2crm.io` → A/AAAA **ALIAS** → CloudFront (frontend) — e.g., `d1jypy8wyylta.cloudfront.net`
  - `api.site2crm.io` → A/AAAA **ALIAS** → CloudFront (backend) — e.g., `d2bqpa4yo32j44.cloudfront.net`
  - `origin-api.site2crm.io` → A (non-alias) → `34.230.32.54` (EC2 origin)
- **TLS:** ACM certificate for `*.site2crm.io` in `us-east-1`
- **WAF:** Enabled in **Monitor** with SQLi rules, rate limiting (2,000 req/5 min/IP)

---

## 2) Local Development (Windows)

**Root repo:** `C:\Users\jguti\slms`

### 2.1 Backend (FastAPI)
```powershell
# From repo root
# (Optional) Use your existing venv path: C:\Users\jguti\slms\venv
python -m venv .\venv
.\venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt

# Apply DB migrations (if Alembic is configured)
alembic upgrade head

# Run API locally
uvicorn main:app --reload --port 8000
```

### 2.2 Frontend (React + Vite)
```powershell
cd .\slms-frontend
npm install
# Dev server on port 5173
npm run dev
```

**Frontend env (production build setting used by CI/CD):**
```
slms-frontend/.env.production
VITE_API_URL=https://api.site2crm.io
```

**API Helper (behavior):**
- Persists Bearer token to `localStorage`
- Sends credentials cookies
- On 401, auto-calls `/token/refresh` then retries once
- Uses `VITE_API_URL` (defaults to `http://127.0.0.1:8000` if unset)

---

## 3) Production: EC2 + Nginx + Gunicorn

**Systemd service: `/etc/systemd/system/site2crm.service`**
```ini
[Unit]
Description=Site2CRM Backend (Gunicorn + UvicornWorker)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/site2crm
Environment="PYTHONPATH=/home/ubuntu/site2crm"
Environment="PATH=/opt/site2crm/.venv/bin:/usr/bin"
ExecStart=/opt/site2crm/.venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 3 -b 127.0.0.1:8000 main:app
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Nginx origin site (HTTP only for CloudFront origin):** `/etc/nginx/sites-available/site2crm_origin`
```nginx
server {
  listen 80;
  listen [::]:80;
  server_name origin-api.site2crm.io api.site2crm.io;
  client_max_body_size 25m;
  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
    proxy_connect_timeout 60;
    proxy_send_timeout 300;
  }
}
```

**Handy EC2 commands (bash):**
```bash
# service status
sudo systemctl status site2crm --no-pager -l
sudo systemctl status nginx --no-pager -l

# restart/reload
sudo systemctl restart site2crm
sudo systemctl reload nginx

# quick origin tests (CloudFront Host header)
curl -I http://127.0.0.1/docs -H "Host: api.site2crm.io"
curl -s -o /dev/null -D - http://127.0.0.1/docs -H "Host: api.site2crm.io"
```

---

## 4) CI/CD — Backend (GitHub Actions → AWS SSM)

**Secrets (GitHub → repo → Settings → Secrets and variables → Actions):**
```
AWS_ACCESS_KEY_ID=<SECRET>
AWS_SECRET_ACCESS_KEY=<SECRET>
AWS_REGION=us-east-1
SSM_INSTANCE_ID=i-01977062444714a53
```

**Workflow:** `.github/workflows/deploy-ssm.yml`
```yaml
name: Deploy Backend (SSM)

on:
  push:
    branches: [ "main" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS creds
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Send SSM deploy command
        id: send
        run: |
          set -euo pipefail
          CMD_ID=$(aws ssm send-command \
            --instance-ids ${{ secrets.SSM_INSTANCE_ID }} \
            --document-name "AWS-RunShellScript" \
            --comment "Deploy Site2CRM via SSM" \
            --parameters commands='[
              "set -euo pipefail",
              "cd /home/ubuntu/site2crm",
              "git fetch --all --prune",
              "git reset --hard origin/main",
              "/opt/site2crm/.venv/bin/pip install --upgrade pip",
              "/opt/site2crm/.venv/bin/pip install -r requirements.txt",
              "[ -f alembic.ini ] && /opt/site2crm/.venv/bin/alembic upgrade head || true",
              "sudo systemctl daemon-reload",
              "sudo systemctl restart site2crm",
              "sudo systemctl reload nginx || true",
              "sudo systemctl --no-pager -l status site2crm || true"
            ]' \
            --query "Command.CommandId" --output text)
          echo "command_id=$CMD_ID" >> $GITHUB_OUTPUT

      - name: Wait for SSM command to finish
        run: |
          set -euo pipefail
          CMD_ID="${{ steps.send.outputs.command_id }}"
          INST="${{ secrets.SSM_INSTANCE_ID }}"
          for i in {1..30}; do
            STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INST" --query "Status" --output text || true)
            echo "Status: $STATUS"
            if [ "$STATUS" = "Success" ]; then break; fi
            if [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Cancelled" ] || [ "$STATUS" = "TimedOut" ]; then exit 1; fi
            sleep 10
          done
          aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INST" --query 'StandardOutputContent' --output text || true
          aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INST" --query 'StandardErrorContent' --output text || true
```

**What “good” looks like:**
- Command status reaches **Success**
- Gunicorn service is active
- `/docs` loads through CloudFront (`https://api.site2crm.io/docs`)

---

## 5) CI/CD — Frontend (GitHub Actions → S3 + CloudFront)

**AWS & S3**
- Bucket: `site2crm-frontend-prod` (Region: `us-east-1`)
- CloudFront **Distribution ID:** `E1T0ATNKXI2NS` (domain aliased from `site2crm.io`)

**IAM user:** `github-actions-frontend`  
**Inline policy (least-privilege):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FrontendS3Access",
      "Effect": "Allow",
      "Action": ["s3:ListBucket","s3:PutObject","s3:PutObjectAcl","s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::site2crm-frontend-prod",
        "arn:aws:s3:::site2crm-frontend-prod/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "*"
    }
  ]
}
```

**GitHub Secrets (frontend):**
```
AWS_ACCESS_KEY_ID_FRONTEND=<SECRET>
AWS_SECRET_ACCESS_KEY_FRONTEND=<SECRET>
AWS_REGION=us-east-1
S3_BUCKET=site2crm-frontend-prod
CLOUDFRONT_DISTRIBUTION_ID=E1T0ATNKXI2NS
```

**Workflow:** `.github/workflows/frontend-deploy.yml`
```yaml
name: Deploy Frontend (S3 + CloudFront)

on:
  push:
    branches: [ "main" ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      S3_BUCKET: ${{ secrets.S3_BUCKET }}
      CF_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Detect frontend directory
        id: detect
        run: |
          set -euo pipefail
          if [ -f slms-frontend/package.json ]; then
            echo "dir=slms-frontend" >> $GITHUB_OUTPUT
          elif [ -f package.json ]; then
            echo "dir=." >> $GITHUB_OUTPUT
          elif [ -f frontend/package.json ]; then
            echo "dir=frontend" >> $GITHUB_OUTPUT
          elif [ -f apps/web/package.json ]; then
            echo "dir=apps/web" >> $GITHUB_OUTPUT
          else
            echo "No package.json found (checked slms-frontend/, ., frontend/, apps/web/)"
            exit 1
          fi

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: "${{ steps.detect.outputs.dir }}/package-lock.json"

      - name: Install dependencies
        working-directory: ${{ steps.detect.outputs.dir }}
        run: npm ci

      - name: Build (Vite)
        working-directory: ${{ steps.detect.outputs.dir }}
        run: npm run build

      - name: Configure AWS credentials (frontend)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_FRONTEND }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_FRONTEND }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Sync assets to S3 (immutable, exclude index.html)
        run: |
          aws s3 sync "${{ steps.detect.outputs.dir }}/dist" "s3://${S3_BUCKET}" \
            --delete \
            --exclude "index.html" \
            --cache-control "public, max-age=31536000, immutable"

      - name: Upload index.html (no-cache)
        run: |
          aws s3 cp "${{ steps.detect.outputs.dir }}/dist/index.html" "s3://${S3_BUCKET}/index.html" \
            --cache-control "no-cache, no-store, must-revalidate" \
            --content-type "text/html; charset=utf-8"

      - name: Invalidate CloudFront (index + root)
        run: |
          aws cloudfront create-invalidation \
            --distribution-id "$CF_DISTRIBUTION_ID" \
            --paths "/index.html" "/"
```

**What “good” looks like:**
- All steps green; “Invalidate CloudFront” returns an `InvalidationId`
- S3 shows `index.html` + `assets/*`
- `https://site2crm.io` shows updated build

**Rollback:**
```powershell
# Revert last commit locally then push (triggers redeploy)
git revert HEAD~1
git push origin main

# OR upload a previous dist/ snapshot (advanced)
# and re-invalidate CloudFront /* for immediate effect
```

**Manual invalidation (PowerShell, if ever needed):**
```powershell
aws cloudfront create-invalidation --distribution-id E1T0ATNKXI2NS --paths "/*"
```

---

## 6) DNS / CloudFront / SSL

- CloudFront Viewer Protocol: redirect HTTP → HTTPS
- Backend methods allowed: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
- `CachingDisabled` for API paths (AllViewer origin request policy)
- ACM Certificate in `us-east-1`: `*.site2crm.io`

**DNS checks (PowerShell):**
```powershell
nslookup api.site2crm.io
nslookup origin-api.site2crm.io
# Verify via CloudFront
Invoke-WebRequest -Uri "https://api.site2crm.io/docs" -UseBasicParsing
```

---

## 7) Security & Compliance

- **No secrets in repo** — use `.env` locally, environment/SSM on EC2.
- **IAM least-privilege** for CI users (`github-actions-frontend`, backend deploy user).
- **SSM over SSH** for automation; lock SSH (22) to admin IP only.
- **WAF:** Currently monitor mode. Plan: flip to **Block** after observing false positives.
- **JWT** issued via `/token`, refresh via `/token/refresh`; cookies supported.

---

## 8) Observability & Health (Roadmap)

- Enable **CloudFront** and **S3** access logs to an S3 logging bucket
- Enable **Nginx** access/error logs rotation and ship to CloudWatch
- Add basic CloudWatch alarms (5xx rates, elevated latency)
- Add `/health` FastAPI route (later ELB/ALB checks): returns `{ "status": "ok" }`

---

## 9) Troubleshooting (Common)

**Symptoms:** Frontend shows old version  
**Fix:** CloudFront invalidation
```powershell
aws cloudfront create-invalidation --distribution-id E1T0ATNKXI2NS --paths "/*"
```

**Symptoms:** Frontend build fails: missing scripts  
**Fix:** Add to `slms-frontend/package.json`
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Symptoms:** TypeScript errors on API helper calls  
**Fix:** Use `api.get(...)` or your `fetchJSON` wrapper; avoid calling an object as a function

**Symptoms:** S3 CLI “Unable to locate credentials”  
**Fix (Windows):**
```powershell
aws configure
# Enter Access Key ID/Secret (frontend deploy IAM)
# Region: us-east-1
```

**Symptoms:** API not responding through CF  
**Fix:** Check backend service + Nginx on EC2
```bash
sudo systemctl status site2crm --no-pager -l
sudo systemctl status nginx --no-pager -l
curl -I http://127.0.0.1/docs -H "Host: api.site2crm.io"
```

---

## 10) Appendix

**Quick seed ideas for a demo:**
- Create 10–20 leads with mixed sources/statuses so the dashboard isn’t empty
- Create a demo user; verify `POST /token` and `GET /me`

**Handy Git (PowerShell):**
```powershell
git add .
git commit -m "Update"
git push origin main
```

**Handy AWS (PowerShell):**
```powershell
aws s3 ls s3://site2crm-frontend-prod --region us-east-1
aws cloudfront create-invalidation --distribution-id E1T0ATNKXI2NS --paths "/index.html" "/"
```

---

**Document owner:** @joshuarg007  
**Last updated:** 2025-11-12 (Checkpoint 3 — Frontend CI/CD Fully Operational)
