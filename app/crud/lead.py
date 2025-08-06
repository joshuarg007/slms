from sqlalchemy.orm import Session
from app.schemas.lead import LeadCreate
from app.db import models
from app.integrations.hubspot import create_contact

async def create_lead(db: Session, lead: LeadCreate):
    db_lead = models.Lead(**lead.dict())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)

    try:
        await create_contact(
            email=db_lead.email,
            first_name=db_lead.first_name,
            last_name=db_lead.last_name,
            phone=db_lead.phone
        )
    except Exception as e:
        print("HubSpot sync failed:", e)

    return db_lead
