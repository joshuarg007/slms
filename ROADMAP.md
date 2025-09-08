# SLMS / Site2CRM – Roadmap

This document tracks planned future requirements and their implementation order.  
Development priorities are sequenced for maximum business value and scalability.

---

## 1. CRM Enhancements
- [ ] Salesforce integration (auth + lead sync)
- [ ] Zoho integration
- [ ] Webhook support (custom CRMs can push data)
- [ ] Unified integration dashboard (manage multiple CRMs at once)

## 2. Analytics & AI
- [ ] Lead scoring model (ML pipeline: start with logistic regression / XGBoost)
- [ ] Salesperson performance ranking (calls, emails, deals weighted)
- [ ] Multi-CRM analytics aggregation (cross-org dashboards)
- [ ] Predictive dashboard (conversion and pipeline forecasting)

## 3. Growth Features
- [ ] Gems/ads gamification for freemium orgs
- [ ] Referral / invite system (reward orgs for inviting)
- [ ] Public landing page (marketing site, docs, signup funnel)

## 4. Billing & Subscription
- [ ] Backend enforcement (`org_has_active_subscription` guard on Pro-only endpoints)
- [ ] Frontend upsell states (UI if Free plan, CTA to upgrade)
- [ ] Downgrade flow (Stripe cancels → restrict features)
- [ ] Admin-only subscription view in Settings

## 5. Compliance & Security
- [ ] GDPR/CCPA features (right-to-be-forgotten, export, consent management)
- [ ] Audit logs (user actions tracked per org)
- [ ] Data retention policies (auto-delete stale leads)

## 6. DevOps & Scaling
- [ ] Full Dockerization (frontend + backend)
- [ ] GitHub Actions CI/CD (tests, migrations, deploy to AWS)
- [ ] AWS infra expansion (S3 docs, CloudWatch dashboards, Cognito optional auth)
- [ ] Multi-region database replicas for scaling
