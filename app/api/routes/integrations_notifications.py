from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_db
from app.db import models

router = APIRouter(prefix="/integrations/notifications", tags=["Integrations"])


class NotificationSettingsSchema(BaseModel):
    new_lead: bool = True
    crm_error: bool = True
    daily_digest: bool = False
    weekly_digest: bool = True
    salesperson_digest: bool = False


class NotificationPayload(BaseModel):
    channel: str = "email"
    settings: NotificationSettingsSchema


@router.get("")
def get_notification_settings(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notification settings for the current organization."""
    org_id = user.organization_id

    # Try to get existing settings
    settings = db.query(models.NotificationSettings).filter(
        models.NotificationSettings.organization_id == org_id
    ).first()

    if settings:
        return {
            "organization_id": org_id,
            "channel": settings.channel,
            "settings": {
                "new_lead": settings.new_lead,
                "crm_error": settings.crm_error,
                "daily_digest": settings.daily_digest,
                "weekly_digest": settings.weekly_digest,
                "salesperson_digest": settings.salesperson_digest,
            },
        }

    # Return defaults if no settings exist
    return {
        "organization_id": org_id,
        "channel": "email",
        "settings": {
            "new_lead": True,
            "crm_error": True,
            "daily_digest": False,
            "weekly_digest": True,
            "salesperson_digest": False,
        },
    }


@router.post("")
def save_notification_settings(
    payload: NotificationPayload = Body(...),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save notification settings for the current organization."""
    org_id = user.organization_id

    # Try to get existing settings
    settings = db.query(models.NotificationSettings).filter(
        models.NotificationSettings.organization_id == org_id
    ).first()

    if settings:
        # Update existing
        settings.new_lead = payload.settings.new_lead
        settings.crm_error = payload.settings.crm_error
        settings.daily_digest = payload.settings.daily_digest
        settings.weekly_digest = payload.settings.weekly_digest
        settings.salesperson_digest = payload.settings.salesperson_digest
        settings.channel = payload.channel
    else:
        # Create new
        settings = models.NotificationSettings(
            organization_id=org_id,
            new_lead=payload.settings.new_lead,
            crm_error=payload.settings.crm_error,
            daily_digest=payload.settings.daily_digest,
            weekly_digest=payload.settings.weekly_digest,
            salesperson_digest=payload.settings.salesperson_digest,
            channel=payload.channel,
        )
        db.add(settings)

    db.commit()
    db.refresh(settings)

    return {
        "organization_id": org_id,
        "channel": settings.channel,
        "settings": {
            "new_lead": settings.new_lead,
            "crm_error": settings.crm_error,
            "daily_digest": settings.daily_digest,
            "weekly_digest": settings.weekly_digest,
            "salesperson_digest": settings.salesperson_digest,
        },
        "message": "Notification settings saved successfully",
    }


# Helper function to get notification settings for an org
def get_org_notification_settings(db: Session, org_id: int) -> models.NotificationSettings | None:
    """Get notification settings for an organization. Returns None if not configured."""
    return db.query(models.NotificationSettings).filter(
        models.NotificationSettings.organization_id == org_id
    ).first()
