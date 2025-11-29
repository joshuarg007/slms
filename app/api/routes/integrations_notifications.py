from typing import Optional
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from app.api.deps.auth import get_current_user
from app.db import models

router = APIRouter(prefix="/integrations/notifications", tags=["Integrations"])


class NotificationSettings(BaseModel):
    new_lead: bool = True
    crm_error: bool = True
    daily_digest: bool = False
    weekly_digest: bool = True
    salesperson_digest: bool = False


class NotificationPayload(BaseModel):
    channel: str = "email"
    settings: NotificationSettings


# In-memory storage for now (should be persisted to DB in production)
# Key: organization_id, Value: NotificationSettings
_org_settings: dict[int, NotificationSettings] = {}


@router.get("/")
async def get_notification_settings(user: models.User = Depends(get_current_user)):
    """Get notification settings for the current organization."""
    org_id = user.organization_id
    settings = _org_settings.get(org_id, NotificationSettings())
    return {
        "organization_id": org_id,
        "channel": "email",
        "settings": settings.model_dump(),
    }


@router.post("/")
async def save_notification_settings(
    payload: NotificationPayload = Body(...),
    user: models.User = Depends(get_current_user),
):
    """Save notification settings for the current organization."""
    org_id = user.organization_id
    _org_settings[org_id] = payload.settings
    return {
        "organization_id": org_id,
        "channel": payload.channel,
        "settings": payload.settings.model_dump(),
        "message": "Notification settings saved successfully",
    }
