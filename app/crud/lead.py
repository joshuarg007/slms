from typing import List, Optional
from sqlalchemy.orm import Session

from app.db import models
from app.schemas.lead import LeadCreate, LeadUpdate


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


def create_lead(db: Session, lead_in: LeadCreate) -> models.Lead:
    """
    Create a lead, carrying through organization_id when provided.
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
        organization_id=lead_in.organization_id,  # <- new
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
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
