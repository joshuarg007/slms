# Session Notes - November 28, 2025

## What Was Completed This Session

### 1. Meta Tags / Open Graph (DONE)
- Updated `/slms-frontend/index.html` with:
  - Primary meta tags (title, description, keywords)
  - Open Graph tags for Facebook/LinkedIn
  - Twitter Card tags
  - Theme color for mobile browsers
- **Action needed:** Create `og-image.png` (1200x630px) and host at `https://site2crm.io/og-image.png`

### 2. Loading Skeletons (DONE)
- Created `/slms-frontend/src/components/ui/Skeleton.tsx`
- Components: `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonHero`, `SkeletonTable`, `SkeletonPage`

### 3. Rate Limiting (DONE)
- Created `/app/core/rate_limit.py`
- Applied to:
  - `/api/contact` - 5 requests/hour per IP
  - `/api/forgot-password` - 5 requests/hour per IP
- Config for other endpoints ready (login: 10/5min, signup: 5/hour)

### 4. reCAPTCHA v3 (DONE)
- Backend: `/app/core/captcha.py`
- Frontend hook: `/slms-frontend/src/hooks/useRecaptcha.ts`
- Updated `ContactForm.tsx` to use reCAPTCHA
- **Gracefully disabled** when keys not configured

### 5. Email Service Enhanced (DONE)
- Rewrote `/app/services/email.py` with HTML templates
- Functions:
  - `send_password_reset_email(recipient, reset_url)`
  - `send_welcome_email(recipient, user_name)`
  - `send_new_lead_notification(recipients, lead_name, ...)`
  - `send_contact_form_notification(recipients, name, email, ...)`
- Wired up to:
  - `/api/forgot-password` endpoint
  - `/api/contact` endpoint

### 6. Password Reset Flow (DONE - Previous Session)
- Frontend: `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- Backend: `/app/api/routes/password_reset.py`

### 7. Updated claude.md (DONE)
- Added all new files and features

---

## PENDING ACTIONS FOR YOU

### 1. Create reCAPTCHA v3 Keys
URL: https://www.google.com/recaptcha/admin

Settings:
- Type: **reCAPTCHA v3** (score-based, NOT challenge)
- Domains: `site2crm.io`, `api.site2crm.io`, `localhost`

You'll get:
- **Site Key** (public, goes in frontend)
- **Secret Key** (private, goes in backend)

### 2. Add Keys to EC2 Backend

SSH into EC2:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

Or use AWS SSM Session Manager.

Edit the .env file:
```bash
nano /home/ubuntu/site2crm/.env
```

Add this line:
```
RECAPTCHA_SECRET_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Restart:
```bash
sudo systemctl restart site2crm.service
```

### 3. Add Site Key to Frontend

Option A - Edit on EC2:
```bash
nano /home/ubuntu/site2crm/slms-frontend/.env
```
Add:
```
VITE_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Then rebuild frontend.

Option B - Edit locally and commit:
Edit `/home/joshua/slms/slms-frontend/.env.production`:
```
VITE_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Commit and push - CI/CD will deploy it.

### 4. Create OG Image
- Size: 1200x630 pixels
- Host at: `https://site2crm.io/og-image.png`
- Used when sharing links on social media

### 5. Review Legal Pages
- `/slms-frontend/src/pages/public/TermsPage.tsx` - placeholder content
- `/slms-frontend/src/pages/public/PrivacyPage.tsx` - placeholder content
- Get lawyer to review/write actual legal text

---

## AWS INFRASTRUCTURE REMINDER

From your notes:

| Service | Purpose |
|---------|---------|
| EC2 | Ubuntu instance running FastAPI + Nginx |
| SES | Email transport (notifications@site2crm.io) |
| WorkMail | Mailbox management |
| RDS Postgres | Exists but not wired (using SQLite) |
| SSM | Instance management |
| CloudWatch | Logs and metrics |
| Route 53 | DNS |
| ACM | TLS certificates |

**Important paths on EC2:**
- Backend: `/home/ubuntu/site2crm/`
- .env file: `/home/ubuntu/site2crm/.env`
- SQLite DB: `/home/ubuntu/site2crm/test.db`
- Systemd service: `site2crm.service`
- Venv: `/opt/site2crm/.venv`

**After any deploy:**
```bash
sudo chown ubuntu:ubuntu /home/ubuntu/site2crm/test.db
sudo systemctl restart site2crm.service
```

---

## OPTIONAL FUTURE ENHANCEMENTS

1. **Analytics** - Google Analytics or Plausible (on the burner)
2. **Rate limit login/signup** - code ready, just needs wiring
3. **Welcome email on signup** - function exists, needs to be called in auth.py
4. **Lead notification emails** - function exists, wire to lead creation
5. **Redis rate limiting** - for multi-instance/production scale

---

## FILES CREATED/MODIFIED THIS SESSION

### New Files
- `/app/core/rate_limit.py`
- `/app/core/captcha.py`
- `/slms-frontend/src/components/ui/Skeleton.tsx`
- `/slms-frontend/src/hooks/useRecaptcha.ts`

### Modified Files
- `/slms-frontend/index.html` - meta tags
- `/slms-frontend/src/components/marketing/ContactForm.tsx` - reCAPTCHA + rate limit error handling
- `/app/api/routes/contact.py` - rate limiting + CAPTCHA
- `/app/api/routes/password_reset.py` - rate limiting + email service
- `/app/services/email.py` - complete rewrite with HTML templates
- `/app/core/config.py` - email_from_name changed to "Site2CRM"
- `/claude.md` - updated with all new features

---

## CURRENT STATE

Everything is code-complete. On next `git push`:
- All features deploy automatically via GitHub Actions
- reCAPTCHA will be **disabled** until you add the keys
- Rate limiting is **active** immediately
- Email templates are **ready** (already configured with SES)

You just need to:
1. Add reCAPTCHA keys (optional but recommended)
2. Create OG image for social sharing
3. Review legal page content
