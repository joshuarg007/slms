# SLMS (Site2CRM) - Claude Code Guidelines

## MASTER RULES (Apply to ALL sessions)

1. **AI Analytics for SaaS ONLY** - Site2CRM is an AI-powered analytics platform exclusively for SaaS companies. All features, messaging, and development must target SaaS businesses specifically. No generic "small business" or multi-vertical positioning.

## User Preferences

- **One step/question at a time** - Prevent confusion by not overwhelming with multiple parallel tasks or questions. Take things incrementally.

## Project Overview

SLMS is an **AI-powered analytics platform for SaaS companies**, branded as **Site2CRM**.

**Target Market**: SaaS companies seeking intelligent lead analytics, predictive scoring, and AI-driven insights for their sales pipeline.

**Core Value Proposition**: AI analytics that help SaaS companies understand, score, and convert leads with data-driven intelligence.

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
