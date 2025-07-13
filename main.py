from fastapi import FastAPI, Depends, status
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Lead
from schemas import LeadCreate
from crud import create_lead

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/public/leads", status_code=status.HTTP_201_CREATED)
def submit_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = create_lead(db, lead)
    return {"message": "Lead received", "lead_id": db_lead.id}
