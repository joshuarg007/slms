from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.db import models
from app.schemas.lead import LeadCreate, LeadUpdate
from app.core.plans import get_plan_limits


def get_leads(db: Session, organization_id: Optional[int] = None) -> List[models.Lead]:
    """
    Return all leads; if organization_id is provided, filter by it.
    """
    q = db.query(models.Lead)
    if organization_id is not None:
        q = q.filter(models.Lead.organization_id == organization_id)
    return q.order_by(models.Lead.created_at.desc().nullslast()).all()


def get_lead(db: Session, lead_id: int) -> Optional[models.Lead]:
    return db.query(models.Lead).filter(models.Lead.id == lead_id).first()


def check_lead_limit(db: Session, organization_id: int) -> Tuple[bool, int, int]:
    """
    Check if organization can create more leads this month.
    Returns (allowed, current_count, limit).
    Also resets the monthly counter if needed.
    """
    org = db.get(models.Organization, organization_id)
    if not org:
        return False, 0, 0

    now = datetime.utcnow()

    # Reset counter if it's a new month
    if org.leads_month_reset is None or org.leads_month_reset.month != now.month or org.leads_month_reset.year != now.year:
        org.leads_this_month = 0
        org.leads_month_reset = now
        db.commit()

    limits = get_plan_limits(org.plan)

    # -1 means unlimited
    if limits.leads_per_month == -1:
        return True, org.leads_this_month, -1

    allowed = org.leads_this_month < limits.leads_per_month
    return allowed, org.leads_this_month, limits.leads_per_month


def increment_lead_count(db: Session, organization_id: int) -> None:
    """Increment the lead counter for an organization."""
    org = db.get(models.Organization, organization_id)
    if org:
        org.leads_this_month += 1
        db.commit()


def create_lead(db: Session, lead_in: LeadCreate, enforce_limit: bool = True) -> models.Lead:
    """
    Create a lead, carrying through organization_id when provided.
    If enforce_limit is True, will increment the lead counter.
    """
    obj = models.Lead(
        email=lead_in.email,
        name=lead_in.name,
        first_name=lead_in.first_name,
        last_name=lead_in.last_name,
        phone=lead_in.phone,
        company=lead_in.company,
        notes=lead_in.notes,
        source=lead_in.source,
        organization_id=lead_in.organization_id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)

    # Increment the monthly lead counter
    if enforce_limit and lead_in.organization_id:
        increment_lead_count(db, lead_in.organization_id)

    return obj


def update_lead(db: Session, lead_id: int, lead_in: LeadUpdate) -> Optional[models.Lead]:
    obj = get_lead(db, lead_id)
    if not obj:
        return None

    # Update only provided fields
    for field, value in lead_in.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_lead(db: Session, lead_id: int) -> bool:
    obj = get_lead(db, lead_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def get_lead_metrics(db: Session) -> Dict[str, Any]:
    """
    Get dashboard metrics: leads by month, by source, and by status.
    Works with both PostgreSQL and SQLite.
    """
    dialect = db.bind.dialect.name if db.bind else "postgresql"

    # Leads by month (last 12 months) - dialect-specific date formatting
    if dialect == "sqlite":
        month_expr = func.strftime('%Y-%m', models.Lead.created_at)
    else:
        month_expr = func.to_char(models.Lead.created_at, 'YYYY-MM')

    leads_by_month = (
        db.query(
            month_expr.label('month'),
            func.count(models.Lead.id).label('count')
        )
        .filter(models.Lead.created_at.isnot(None))
        .group_by(month_expr)
        .order_by(month_expr.desc())
        .limit(12)
        .all()
    )

    # Leads by source
    lead_sources = (
        db.query(
            func.coalesce(models.Lead.source, 'unknown').label('source'),
            func.count(models.Lead.id).label('count')
        )
        .group_by(func.coalesce(models.Lead.source, 'unknown'))
        .order_by(func.count(models.Lead.id).desc())
        .all()
    )

    # Leads by status
    status_counts = (
        db.query(
            func.coalesce(models.Lead.status, 'new').label('status'),
            func.count(models.Lead.id).label('count')
        )
        .group_by(func.coalesce(models.Lead.status, 'new'))
        .order_by(func.count(models.Lead.id).desc())
        .all()
    )

    return {
        "leads_by_month": [{"month": m, "count": c} for m, c in leads_by_month],
        "lead_sources": [{"source": s, "count": c} for s, c in lead_sources],
        "status_counts": [{"status": s, "count": c} for s, c in status_counts],
    }
