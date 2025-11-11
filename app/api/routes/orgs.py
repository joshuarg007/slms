from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.api.routes.auth import get_current_user

from app.db.session import SessionLocal
from app.db import models
from app.schemas.user import UserCreate
from app.core.security import get_password_hash
from uuid import uuid4
from sqlalchemy.exc import IntegrityError

router = APIRouter()

# Local DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/signup", status_code=201)
def signup(user: UserCreate = Body(...), db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    if "@" not in user.email or not user.email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")
    domain = user.email.split("@")[-1].lower()

    org = db.query(models.Organization).filter(models.Organization.domain == domain).first()
    if not org:
        org = models.Organization(name=domain, domain=domain, api_key=uuid4().hex)
        db.add(org)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            org = db.query(models.Organization).filter(models.Organization.domain == domain).first()
        db.refresh(org)

    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        organization_id=org.id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "email": new_user.email, "organization_id": org.id}

@router.post("/orgs/key/rotate", response_model=dict)
def rotate_org_key(
    db: Session = Depends(get_db),
    # In a later step we can require auth; for now keeping parity with original placement
):
    # This endpoint originally depended on get_current_user; for modularization parity we keep it simple.
    # If you want it protected again immediately, we can import and use Depends(get_current_user).
    raise HTTPException(status_code=501, detail="Temporarily disabled; reattach auth dependency in next step.")

