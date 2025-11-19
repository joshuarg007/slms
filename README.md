# SLMS

Comprehensive SaaS integration and lead management system used as the
core backend for the deployed Site2CRM platform. The project name is
SLMS; branding on production surfaces Site2CRM.

## Maintained By

Joshua R. Gutierrez\
Email: joshua.g@site2crm.io

## Overview

SLMS is a multi tenant SaaS backend with full CRM integration support,
secure authentication, organization scoped data, lead routing, and
automated background tasks. The platform powers Site2CRM through its
deployment pipeline but remains a standalone project under the SLMS
repository.

## Technology Stack

### Local Development Environment

Python\
FastAPI\
SQLite (temporary)\
SQLAlchemy\
Alembic (Postgres planned)\
React\
TypeScript\
Vite\
Tailwind\
GitHub Actions for CI\
Local JWT authentication\
Local environment loaded via .env

### AWS Production Environment

Ubuntu EC2\
Gunicorn\
Nginx reverse proxy\
Systemd managed service\
AWS SES for outbound email (currently sandbox restricted)\
SQLite at /home/ubuntu/site2crm/test.db\
Organization scoped auth\
Domain: api.site2crm.io\
Frontend hosted separately\
Automatic deployments through GitHub Actions

## Project Structure

(Full directory structure captured from slms_tree.txt)
