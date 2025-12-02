# SLMS (Site2CRM) - Claude Code Guidelines

## User Preferences

- **One step/question at a time** - Prevent confusion by not overwhelming with multiple parallel tasks or questions. Take things incrementally.

## Project Overview

SLMS is a multi-tenant SaaS lead management platform branded as **Site2CRM**.

## Tech Stack

- **Backend**: FastAPI (Python), SQLAlchemy, SQLite/PostgreSQL
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Infrastructure**: AWS EC2, S3, CloudFront, SES

## Key Directories

- `app/` - FastAPI backend
- `slms-frontend/` - React frontend
- `widget/` - Embeddable form widget
- `alembic/` - Database migrations

## Current Feature Branch

`feature/ai-lead-consultant` - AI chat feature using WMEM (Web Memory) format for persistent context.

## Environment

- Backend runs on port 8000
- Frontend runs on port 5173
- `.env` file contains API keys (gitignored)
