from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, engine
from app.db import models
from app.crud import lead as lead_crud
from app.schemas.lead import LeadCreate

from fastapi.middleware.cors import CORSMiddleware

# Create all tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or restrict to ["http://127.0.0.1:5500"] etc.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/public/leads", response_model=dict)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = lead_crud.create_lead(db=db, lead=lead)
    return {"message": "Lead received", "lead_id": db_lead.id}
