from sqlalchemy.orm import Session
from app.db.models import Lead
from app.schemas.lead import LeadCreate

def create_lead(db: Session, lead: LeadCreate):
    db_lead = Lead(**lead.dict())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead
