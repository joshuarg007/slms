from typing import Optional
from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.api.routes.auth import get_current_user

from app.db.session import SessionLocal
from app.db import models
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, create_access_token, create_refresh_token
from app.core.rate_limit import check_rate_limit
from app.services.email import send_email_verification
from uuid import uuid4
from sqlalchemy.exc import IntegrityError

router = APIRouter()

# Verification token expiry (24 hours)
VERIFICATION_TOKEN_EXPIRY_HOURS = 24

# Public email domains - each user gets their own org
PUBLIC_EMAIL_DOMAINS = {
    "gmail.com", "googlemail.com",
    "yahoo.com", "yahoo.co.uk", "ymail.com",
    "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com",
    "icloud.com", "me.com", "mac.com",
    "aol.com",
    "protonmail.com", "proton.me",
    "zoho.com",
    "mail.com",
    "gmx.com", "gmx.net",
    "yandex.com", "yandex.ru",
    "tutanota.com",
    "fastmail.com",
}

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

    # Public email domains (gmail, yahoo, etc.) always get their own org
    is_public_domain = domain in PUBLIC_EMAIL_DOMAINS

    if is_public_domain:
        # Each public email user gets their own organization
        org = models.Organization(
            name=user.email.split("@")[0],  # Use email prefix as name
            domain=f"{uuid4().hex[:8]}.personal",  # Unique pseudo-domain
            api_key=uuid4().hex
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        is_first_user = True
    else:
        # Business domain - check if org exists
        org = db.query(models.Organization).filter(models.Organization.domain == domain).first()
        is_new_org = org is None
        if not org:
            org = models.Organization(name=domain, domain=domain, api_key=uuid4().hex)
            db.add(org)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                org = db.query(models.Organization).filter(models.Organization.domain == domain).first()
                is_new_org = False
            db.refresh(org)

        # Check if this is the first user in the org (becomes OWNER)
        existing_users_count = db.query(models.User).filter(
            models.User.organization_id == org.id
        ).count()
        is_first_user = existing_users_count == 0

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
        role="OWNER" if is_first_user else "USER",
        is_approved=is_first_user,  # First user auto-approved, others need owner approval
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

    # Different message for pending approval
    if is_first_user:
        message = "User created. Please check your email to verify your account."
    else:
        message = "User created. Please check your email to verify your account. An admin will need to approve your access."

    return {
        "message": message,
        "email": new_user.email,
        "organization_id": org.id,
        "email_verification_required": True,
        "approval_required": not is_first_user,
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

    # Start 14-day trial for the organization
    org = db.query(models.Organization).filter(
        models.Organization.id == user.organization_id
    ).first()
    if org and not org.trial_started_at:
        org.trial_started_at = datetime.utcnow()
        org.trial_ends_at = datetime.utcnow() + timedelta(days=14)
        org.plan = "trial"
        org.subscription_status = "trialing"

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

@router.get("/orgs/current")
def get_current_organization(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's organization."""
    org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "id": org.id,
        "name": org.name,
        "domain": org.domain,
        "plan": org.plan,
        "billing_cycle": org.billing_cycle,
        "subscription_status": org.subscription_status,
        "current_period_end": org.current_period_end.isoformat() if org.current_period_end else None,
        "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
        "leads_this_month": org.leads_this_month,
        "ai_messages_this_month": org.ai_messages_this_month,
        "active_crm": org.active_crm,
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "onboarding_completed": org.onboarding_completed,
        "team_size": org.team_size,
    }


@router.post("/onboarding/complete")
def complete_onboarding(
    company_name: str = Body(...),
    crm: str = Body(...),
    team_size: str = Body(...),
    form_theme: str = Body(None),
    form_fields: list = Body(None),
    custom_color: str = Body(None),
    custom_border: bool = Body(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Complete onboarding for the current user's organization."""
    import json
    from datetime import datetime as dt

    org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Validate CRM choice
    valid_crms = ["hubspot", "salesforce", "pipedrive", "nutshell", "zoho", "none"]
    if crm.lower() not in valid_crms:
        raise HTTPException(status_code=400, detail=f"Invalid CRM. Must be one of: {', '.join(valid_crms)}")

    # Validate team size
    valid_sizes = ["just_me", "2-5", "6-20", "20+"]
    if team_size not in valid_sizes:
        raise HTTPException(status_code=400, detail=f"Invalid team size. Must be one of: {', '.join(valid_sizes)}")

    org.name = company_name
    org.active_crm = crm.lower() if crm.lower() != "none" else "hubspot"
    org.team_size = team_size
    org.onboarding_completed = True

    # Save form configuration if provided
    if form_theme or form_fields:
        # Theme to color mapping
        theme_colors = {
            "modern": "#4F46E5",
            "minimal": "#18181B",
            "bold": "#DC2626",
            "ocean": "#0891B2",
            "forest": "#059669",
            "purple": "#7C3AED",
        }

        # Build fields config
        default_fields = {
            "name": {"key": "name", "label": "Full Name", "field_type": "text", "placeholder": "Ada Lovelace"},
            "email": {"key": "email", "label": "Email", "field_type": "email", "placeholder": "you@domain.com"},
            "phone": {"key": "phone", "label": "Phone", "field_type": "tel", "placeholder": "+1 555 555 5555"},
            "company": {"key": "company", "label": "Company", "field_type": "text", "placeholder": "Acme Inc."},
            "job_title": {"key": "job_title", "label": "Job Title", "field_type": "text", "placeholder": "Sales Manager"},
            "message": {"key": "message", "label": "Message", "field_type": "textarea", "placeholder": "How can we help?"},
        }

        fields_config = []
        enabled_fields = form_fields or ["name", "email", "phone", "company"]
        for field_id in enabled_fields:
            if field_id in default_fields:
                field = default_fields[field_id].copy()
                field["enabled"] = True
                field["required"] = field_id == "email"
                fields_config.append(field)

        config_data = {
            "fields": fields_config,
            "styling": {
                "primaryColor": theme_colors.get(form_theme, "#4F46E5"),
                "borderRadius": "10px",
                "fontFamily": "system-ui",
            },
            "wizard": {"showProgressBar": True, "showSummary": True, "animationDuration": 300},
            "modal": {"triggerButtonText": "Contact Us", "triggerPosition": "bottom-right"},
            "drawer": {"position": "right", "triggerButtonText": "Get in Touch"},
            "branding": {
                "showPoweredBy": True,
                "headerText": "Contact Us",
                "subheaderText": "Fill out the form below",
                "submitButtonText": "Submit",
                "successMessage": "Thanks! We'll be in touch.",
            },
        }

        # Check for existing config
        form_config = db.query(models.FormConfig).filter(
            models.FormConfig.organization_id == org.id
        ).first()

        now = dt.utcnow()
        if form_config:
            form_config.config_json = json.dumps(config_data)
            form_config.updated_at = now
        else:
            form_config = models.FormConfig(
                organization_id=org.id,
                form_style="inline",
                config_json=json.dumps(config_data),
                created_at=now,
                updated_at=now,
            )
            db.add(form_config)

    db.commit()

    # Issue a fresh token after onboarding completes (security best practice)
    new_access_token = create_access_token(current_user.email)
    new_refresh_token = create_refresh_token(current_user.email)

    return {
        "status": "ok",
        "message": "Onboarding completed successfully",
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
    }


@router.get("/users/pending")
def get_pending_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get pending users awaiting approval (OWNER/ADMIN only)."""
    if current_user.role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only owners and admins can view pending users")

    pending = db.query(models.User).filter(
        models.User.organization_id == current_user.organization_id,
        models.User.is_approved == False,
    ).all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "email_verified": u.email_verified,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in pending
    ]


@router.post("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a pending user (OWNER/ADMIN only)."""
    if current_user.role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only owners and admins can approve users")

    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organization_id == current_user.organization_id,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_approved:
        return {"message": "User already approved", "email": user.email}

    user.is_approved = True
    db.commit()

    return {"message": "User approved successfully", "email": user.email}


@router.post("/users/{user_id}/reject")
def reject_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject and delete a pending user (OWNER/ADMIN only)."""
    if current_user.role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only owners and admins can reject users")

    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organization_id == current_user.organization_id,
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_approved:
        raise HTTPException(status_code=400, detail="Cannot reject an already approved user")

    email = user.email
    db.delete(user)
    db.commit()

    return {"message": "User rejected and removed", "email": email}


@router.post("/orgs/key/rotate", response_model=dict)
def rotate_org_key(
    db: Session = Depends(get_db),
    # In a later step we can require auth; for now keeping parity with original placement
):
    # This endpoint originally depended on get_current_user; for modularization parity we keep it simple.
    # If you want it protected again immediately, we can import and use Depends(get_current_user).
    raise HTTPException(status_code=501, detail="Temporarily disabled; reattach auth dependency in next step.")

