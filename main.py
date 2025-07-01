from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, database, schemas        # ⬅ import the schemas

models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="SLMS API (v0.1)")

@app.get("/")
def root():
    return {"msg": "SLMS is alive!"}

# -------- LEADS --------
@app.get("/leads", response_model=list[schemas.LeadOut])
def list_leads(db: Session = Depends(get_db)):
    return db.query(models.Lead).all()

@app.post("/leads", response_model=schemas.LeadOut, status_code=201)
def create_lead(payload: schemas.LeadCreate, db: Session = Depends(get_db)):
    lead = models.Lead(**payload.dict())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
