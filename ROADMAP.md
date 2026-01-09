# Site2CRM – Roadmap

This document tracks planned future requirements and their implementation order.
Development priorities are sequenced for maximum business value and scalability.

**Last Updated:** 2026-01-09

---

## Recently Completed ✅

### AppSumo Lifetime Deal (2026-01-09)
- [x] AppSumo code redemption system (`/api/appsumo/redeem`)
- [x] Lifetime License Addendum acceptance flow
- [x] AppSumo plan limits (1,500 leads, 2 CRMs, 2 forms)
- [x] Admin code management endpoints (`/api/appsumo/admin/codes/*`)
- [x] Welcome email for AppSumo customers
- [x] Redemption UI with dark mode support

### Production Readiness (2026-01-08)
- [x] Structured logging with JSON format
- [x] Standardized API error responses
- [x] Database connection pool optimization
- [x] Sentry error tracking integration
- [x] Automated test suite with CI/CD
- [x] Request timing and correlation IDs

### Billing Safeguards (2026-01-05)
- [x] Triple-charge bug fix
- [x] Idempotency keys for Stripe checkout
- [x] Duplicate subscription prevention
- [x] Checkout URL caching

---

## 1. CRM Enhancements
- [x] HubSpot integration (OAuth + API key)
- [x] Salesforce integration (OAuth)
- [x] Pipedrive integration (OAuth + API key)
- [x] Nutshell integration (API key)
- [ ] Zoho integration
- [ ] Webhook support (custom CRMs can push data)
- [ ] Unified integration dashboard (manage multiple CRMs at once)

## 2. Analytics & AI
- [x] Basic lead analytics dashboard
- [x] Salesperson performance stats
- [ ] Lead scoring model (ML pipeline: start with logistic regression / XGBoost)
- [ ] Salesperson performance ranking (calls, emails, deals weighted)
- [ ] Multi-CRM analytics aggregation (cross-org dashboards)
- [ ] Predictive dashboard (conversion and pipeline forecasting)

## 3. Growth Features
- [x] **AppSumo lifetime deal** ✅ COMPLETE
- [ ] Gems/ads gamification for freemium orgs
- [ ] Referral / invite system (reward orgs for inviting)
- [x] Public landing page (site2crm.io)
- [ ] Help center / FAQ page

## 4. Billing & Subscription
- [x] Stripe subscription integration
- [x] Backend enforcement (plan limits)
- [x] Frontend upsell states (upgrade CTAs)
- [x] AppSumo lifetime license support
- [ ] Downgrade flow (Stripe cancels → restrict features)
- [ ] Admin-only subscription view in Settings

## 5. Compliance & Security
- [ ] GDPR/CCPA features (right-to-be-forgotten, export, consent management)
- [ ] Audit logs (user actions tracked per org)
- [ ] Data retention policies (auto-delete stale leads)

## 6. DevOps & Scaling
- [ ] Full Dockerization (frontend + backend)
- [x] GitHub Actions CI/CD (tests, migrations, deploy to AWS)
- [ ] AWS infra expansion (S3 docs, CloudWatch dashboards)
- [ ] Multi-region database replicas for scaling
- [ ] Redis-backed rate limiting (for horizontal scaling)
- [ ] Blue/green deployment (zero-downtime releases)

## 7. Observability & Monitoring
- [x] Sentry error tracking (frontend + backend)
- [ ] Google Analytics 4 / Plausible
- [ ] Status page (UptimeRobot / Betterstack)
- [ ] APM (Application Performance Monitoring)

## 8. Marketing & Growth
- [ ] Social media presence (Twitter/X, LinkedIn)
- [ ] Blog / content marketing
- [x] API documentation (OpenAPI/Swagger at /docs)
- [ ] Case studies / testimonials page

---

## Priority Queue (Next Up)

1. **GDPR Compliance** - Data export/deletion endpoints
2. **Zoho Integration** - Complete CRM coverage
3. **Help Center** - Reduce support load
4. **Redis Rate Limiting** - Enable horizontal scaling
