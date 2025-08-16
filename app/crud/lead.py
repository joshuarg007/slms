# app/crud/lead.py
from collections import defaultdict
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db import models
from app.schemas.lead import LeadCreate


def _to_dict(pyd):
    # Compatible with Pydantic v2 (model_dump) and v1 (dict)
    if hasattr(pyd, "model_dump"):
        return pyd.model_dump()
    if hasattr(pyd, "dict"):
        return pyd.dict()
    return dict(pyd)


def create_lead(db: Session, lead: LeadCreate) -> models.Lead:
    data = _to_dict(lead)

    # Accept either single "name" or split "first_name"/"last_name" in payload
    raw_name = (data.get("name") or data.get("full_name") or "").strip()
    first_name = data.get("first_name")
    last_name = data.get("last_name")

    if raw_name and not (first_name or last_name):
        parts = raw_name.split(None, 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else None

    # DB requires email for downstream integrations and uniqueness checks
    email = data.get("email")
    if not email:
        raise ValueError("email is required")

    # Determine available columns on the Lead model
    cols = set(models.Lead.__table__.columns.keys())

    # Synthesize a non-null 'name' if the DB requires it
    final_name = raw_name or " ".join(
        p for p in [(first_name or ""), (last_name or "")] if p
    ).strip()
    if "name" in cols and not final_name:
        # Fallback to email to satisfy NOT NULL constraint
        final_name = email

    candidate = {
        # required / common fields
        "email": email,
        "phone": data.get("phone"),
        "company": data.get("company"),
        "notes": data.get("notes"),
        "source": data.get("source"),

        # names
        "name": final_name,
        "first_name": first_name,
        "last_name": last_name,

        # optional organizational scope if present in schema/DB
        "organization_id": data.get("organization_id"),
    }

    # Only pass keys that exist as columns on the model
    lead_kwargs = {k: v for k, v in candidate.items() if k in cols}

    db_lead = models.Lead(**lead_kwargs)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead


def get_lead(db: Session, lead_id: int) -> Optional[models.Lead]:
    return db.query(models.Lead).filter(models.Lead.id == lead_id).first()


def list_leads(db: Session, skip: int = 0, limit: int = 100) -> List[models.Lead]:
    return db.query(models.Lead).offset(skip).limit(limit).all()


def delete_lead(db: Session, lead_id: int) -> bool:
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        return False
    db.delete(lead)
    db.commit()
    return True


def get_lead_metrics(db: Session):
    leads = db.query(models.Lead).all()

    leads_by_month = defaultdict(int)
    lead_sources = defaultdict(int)
    status_counts = defaultdict(int)

    for lead in leads:
        # assumes models.Lead.created_at exists and is a datetime
        month = lead.created_at.strftime("%b")
        leads_by_month[month] += 1

        if getattr(lead, "source", None):
            lead_sources[lead.source] += 1

        # support whichever status-like field your model provides
        val = (
            getattr(lead, "status", None)
            or getattr(lead, "lead_status", None)
            or getattr(lead, "stage", None)
        )
        if val:
            status_counts[val] += 1

    return {
        "leads_by_month": [{"month": m, "count": c} for m, c in sorted(leads_by_month.items())],
        "lead_sources": [{"source": s, "count": c} for s, c in lead_sources.items()],
        "status_counts": [{"status": s, "count": c} for s, c in status_counts.items()],
    }
