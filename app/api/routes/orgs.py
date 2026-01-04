from typing import Optional
from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.api.routes.auth import get_current_user

from app.db.session import SessionLocal
from app.db import models
from app.schemas.user import UserCreate
from app.core.security import get_password_hash
from app.core.rate_limit import check_rate_limit
from app.services.email import send_email_verification
from uuid import uuid4
from sqlalchemy.exc import IntegrityError

router = APIRouter()

# Verification token expiry (24 hours)
VERIFICATION_TOKEN_EXPIRY_HOURS = 24

# Local DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_verification_token() -> str:
    """Generate a secure random verification token."""
    return secrets.token_urlsafe(32)


@router.post("/signup", status_code=201)
def signup(
    request: Request,
    background_tasks: BackgroundTasks,
    user: UserCreate = Body(...),
    db: Session = Depends(get_db),
):
    # Rate limit: 5 signups per hour per IP
    check_rate_limit(request, "signup")

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

    # Generate verification token
    verification_token = generate_verification_token()

    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        organization_id=org.id,
        email_verified=False,
        email_verification_token=verification_token,
        email_verification_sent_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email in background
    verification_url = f"https://site2crm.io/verify-email?token={verification_token}"
    background_tasks.add_task(
        send_email_verification,
        recipient=new_user.email,
        verification_url=verification_url,
    )

    return {
        "message": "User created. Please check your email to verify your account.",
        "email": new_user.email,
        "organization_id": org.id,
        "email_verification_required": True,
    }


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email with token from email link."""
    if not token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    user = db.query(models.User).filter(
        models.User.email_verification_token == token
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    # Check if already verified
    if user.email_verified:
        return {"message": "Email already verified", "email": user.email}

    # Check token expiry
    if user.email_verification_sent_at:
        expiry_time = user.email_verification_sent_at + timedelta(hours=VERIFICATION_TOKEN_EXPIRY_HOURS)
        if datetime.utcnow() > expiry_time:
            raise HTTPException(
                status_code=400,
                detail="Verification token has expired. Please request a new one."
            )

    # Verify the email
    user.email_verified = True
    user.email_verification_token = None  # Clear token after use
    db.commit()

    return {"message": "Email verified successfully", "email": user.email}


@router.post("/resend-verification")
def resend_verification_email(
    email: str = Body(..., embed=True),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    """Resend verification email to user."""
    user = db.query(models.User).filter(models.User.email == email.lower()).first()

    if not user:
        # Don't reveal if user exists
        return {"message": "If an account exists with this email, a verification email has been sent."}

    if user.email_verified:
        return {"message": "Email is already verified"}

    # Rate limit: only allow resend every 5 minutes
    if user.email_verification_sent_at:
        time_since_last = datetime.utcnow() - user.email_verification_sent_at
        if time_since_last < timedelta(minutes=5):
            remaining = 5 - int(time_since_last.total_seconds() / 60)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} minute(s) before requesting another verification email."
            )

    # Generate new token
    new_token = generate_verification_token()
    user.email_verification_token = new_token
    user.email_verification_sent_at = datetime.utcnow()
    db.commit()

    # Send verification email
    verification_url = f"https://site2crm.io/verify-email?token={new_token}"
    if background_tasks:
        background_tasks.add_task(
            send_email_verification,
            recipient=user.email,
            verification_url=verification_url,
        )
    else:
        send_email_verification(
            recipient=user.email,
            verification_url=verification_url,
        )

    return {"message": "Verification email sent"}

@router.post("/orgs/key/rotate", response_model=dict)
def rotate_org_key(
    db: Session = Depends(get_db),
    # In a later step we can require auth; for now keeping parity with original placement
):
    # This endpoint originally depended on get_current_user; for modularization parity we keep it simple.
    # If you want it protected again immediately, we can import and use Depends(get_current_user).
    raise HTTPException(status_code=501, detail="Temporarily disabled; reattach auth dependency in next step.")

