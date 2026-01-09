"""User management routes for organization users."""

from typing import Optional
from datetime import datetime
import secrets
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db import models
from app.api.routes.auth import get_current_user
from app.core.security import get_password_hash
from app.services.email import send_user_invitation_email, send_account_deletion_email

logger = logging.getLogger(__name__)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    is_default: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    role: str = "USER"


class SetDefaultRequest(BaseModel):
    user_id: int


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users in the current user's organization."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    users = (
        db.query(models.User)
        .filter(models.User.organization_id == org_id)
        .order_by(models.User.created_at.asc())
        .all()
    )

    return [
        UserOut(
            id=u.id,
            email=u.email,
            role=getattr(u, "role", None) or "USER",
            is_default=getattr(u, "is_default", False) or False,
            created_at=u.created_at.isoformat() if getattr(u, "created_at", None) else None,
        )
        for u in users
    ]


@router.post("/users", response_model=UserOut)
def create_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create/invite a new user to the organization."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Check if requester has permission (OWNER or ADMIN)
    requester_role = getattr(current_user, "role", "USER") or "USER"
    if requester_role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only OWNER or ADMIN can add users")

    # Validate role
    valid_roles = {"OWNER", "ADMIN", "USER", "READ_ONLY"}
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    # Only OWNER can create other OWNERs
    if user_data.role == "OWNER" and requester_role != "OWNER":
        raise HTTPException(status_code=403, detail="Only OWNER can assign OWNER role")

    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == user_data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Generate a temporary password (user will need to reset)
    temp_password = secrets.token_urlsafe(12)

    new_user = models.User(
        email=user_data.email.lower(),
        hashed_password=get_password_hash(temp_password),
        organization_id=org_id,
        role=user_data.role,
        is_default=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Get organization name for the email
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    org_name = org.name if org else None

    # Send invitation email in background
    background_tasks.add_task(
        send_user_invitation_email,
        recipient=new_user.email,
        temp_password=temp_password,
        inviter_email=current_user.email,
        organization_name=org_name,
        role=user_data.role,
    )

    return UserOut(
        id=new_user.id,
        email=new_user.email,
        role=new_user.role or "USER",
        is_default=new_user.is_default or False,
        created_at=new_user.created_at.isoformat() if new_user.created_at else None,
    )


@router.post("/users/default")
def set_default_user(
    request: SetDefaultRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set the default user for the organization."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Check if requester has permission
    requester_role = getattr(current_user, "role", "USER") or "USER"
    if requester_role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only OWNER or ADMIN can change default user")

    # Verify the target user exists and is in the same org
    target_user = db.query(models.User).filter(
        models.User.id == request.user_id,
        models.User.organization_id == org_id,
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your organization")

    # Clear is_default for all users in org
    db.query(models.User).filter(
        models.User.organization_id == org_id
    ).update({"is_default": False})

    # Set the new default
    target_user.is_default = True
    db.commit()

    return {"ok": True, "default_user_id": target_user.id}


# =============================================================================
# GDPR Compliance Endpoints
# =============================================================================

class DeleteAccountRequest(BaseModel):
    confirm_email: str  # User must type their email to confirm


@router.get("/users/me/export")
def export_user_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GDPR Data Export - Export all user data as JSON.

    Returns all personal data associated with the user including:
    - User profile
    - Organization info
    - Leads
    - Form configurations
    - Integration info (without secrets)
    """
    org_id = current_user.organization_id

    # User data
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": getattr(current_user, "role", "USER"),
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }

    # Organization data
    org_data = None
    if org_id:
        org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
        if org:
            org_data = {
                "id": org.id,
                "name": org.name,
                "domain": org.domain,
                "plan": org.plan,
                "created_at": org.created_at.isoformat() if org.created_at else None,
            }

    # Leads data
    leads_data = []
    if org_id:
        leads = db.query(models.Lead).filter(models.Lead.organization_id == org_id).all()
        for lead in leads:
            leads_data.append({
                "id": lead.id,
                "first_name": lead.first_name,
                "last_name": lead.last_name,
                "email": lead.email,
                "phone": lead.phone,
                "company": lead.company,
                "job_title": lead.job_title,
                "source": lead.source,
                "status": lead.status,
                "notes": lead.notes,
                "created_at": lead.created_at.isoformat() if lead.created_at else None,
            })

    # Form configurations
    form_configs = []
    if org_id:
        configs = db.query(models.FormConfig).filter(models.FormConfig.organization_id == org_id).all()
        for config in configs:
            form_configs.append({
                "id": config.id,
                "form_style": config.form_style,
                "created_at": config.created_at.isoformat() if config.created_at else None,
            })

    # Integration credentials (without secrets)
    integrations = []
    if org_id:
        creds = db.query(models.IntegrationCredential).filter(
            models.IntegrationCredential.organization_id == org_id
        ).all()
        for cred in creds:
            integrations.append({
                "id": cred.id,
                "provider": cred.provider,
                "auth_type": cred.auth_type,
                "is_active": cred.is_active,
                "created_at": cred.created_at.isoformat() if cred.created_at else None,
                # Note: Secrets/tokens are NOT included for security
            })

    export_data = {
        "export_date": datetime.utcnow().isoformat(),
        "export_type": "GDPR_DATA_EXPORT",
        "user": user_data,
        "organization": org_data,
        "leads": leads_data,
        "leads_count": len(leads_data),
        "form_configurations": form_configs,
        "integrations": integrations,
    }

    # Return as downloadable JSON
    response = JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=site2crm_data_export_{current_user.id}_{datetime.utcnow().strftime('%Y%m%d')}.json"
        }
    )

    logger.info(f"GDPR data export for user {current_user.id} ({current_user.email})")

    return response


@router.delete("/users/me")
def delete_account(
    request: DeleteAccountRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GDPR Account Deletion - Permanently delete user account and associated data.

    This will:
    - Delete all leads (if user is the only org member)
    - Delete form configurations (if user is the only org member)
    - Delete integration credentials (if user is the only org member)
    - Delete the organization (if user is the only org member)
    - Delete the user account

    Requires email confirmation to prevent accidental deletion.
    """
    # Verify email confirmation
    if request.confirm_email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=400,
            detail="Email confirmation does not match. Please type your email exactly to confirm deletion."
        )

    org_id = current_user.organization_id
    user_email = current_user.email
    user_id = current_user.id

    logger.warning(f"GDPR account deletion initiated for user {user_id} ({user_email})")

    # Check if user is the only member of the organization
    org_user_count = 0
    if org_id:
        org_user_count = db.query(models.User).filter(
            models.User.organization_id == org_id
        ).count()

    # If user is the only org member, delete all org data
    if org_id and org_user_count == 1:
        logger.info(f"Deleting all org data for org {org_id} (sole member deletion)")

        # Delete leads
        deleted_leads = db.query(models.Lead).filter(
            models.Lead.organization_id == org_id
        ).delete()
        logger.info(f"Deleted {deleted_leads} leads")

        # Delete form configs
        deleted_forms = db.query(models.FormConfig).filter(
            models.FormConfig.organization_id == org_id
        ).delete()
        logger.info(f"Deleted {deleted_forms} form configs")

        # Delete integration credentials
        deleted_creds = db.query(models.IntegrationCredential).filter(
            models.IntegrationCredential.organization_id == org_id
        ).delete()
        logger.info(f"Deleted {deleted_creds} integration credentials")

        # Delete salespeople
        try:
            deleted_salespeople = db.query(models.Salesperson).filter(
                models.Salesperson.organization_id == org_id
            ).delete()
            logger.info(f"Deleted {deleted_salespeople} salespeople")
        except Exception:
            pass  # Table might not exist

        # Delete lead activities
        try:
            deleted_activities = db.query(models.LeadActivity).filter(
                models.LeadActivity.organization_id == org_id
            ).delete()
            logger.info(f"Deleted {deleted_activities} lead activities")
        except Exception:
            pass  # Table might not exist

    # Delete the user
    db.query(models.User).filter(models.User.id == user_id).delete()
    logger.info(f"Deleted user {user_id}")

    # Delete the organization if user was the only member
    if org_id and org_user_count == 1:
        db.query(models.Organization).filter(models.Organization.id == org_id).delete()
        logger.info(f"Deleted organization {org_id}")

    db.commit()

    # Send confirmation email
    background_tasks.add_task(
        send_account_deletion_email,
        recipient=user_email,
    )

    logger.warning(f"GDPR account deletion completed for user {user_id} ({user_email})")

    return {
        "ok": True,
        "message": "Your account has been permanently deleted. A confirmation email has been sent.",
    }
