# app/api/routes/webhooks.py
"""
Webhook management API for Zapier and other integrations.

Endpoints:
- GET /webhooks - List all webhooks for organization
- POST /webhooks - Create a new webhook subscription
- GET /webhooks/{id} - Get webhook details
- DELETE /webhooks/{id} - Delete webhook subscription
- GET /webhooks/{id}/deliveries - Get delivery logs
"""
import secrets
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, HttpUrl, field_validator
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db import models
from app.api.routes.auth import get_current_user

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---- Pydantic Models ----

class WebhookCreate(BaseModel):
    url: HttpUrl
    event: str
    description: Optional[str] = None

    @field_validator("event")
    @classmethod
    def validate_event(cls, v: str) -> str:
        if v not in models.WEBHOOK_EVENTS:
            raise ValueError(f"Invalid event. Must be one of: {', '.join(models.WEBHOOK_EVENTS)}")
        return v


class WebhookResponse(BaseModel):
    id: int
    url: str
    event: str
    description: Optional[str]
    is_active: bool
    secret: Optional[str]
    total_deliveries: int
    successful_deliveries: int
    failed_deliveries: int
    last_delivery_at: Optional[datetime]
    last_success_at: Optional[datetime]
    last_failure_at: Optional[datetime]
    last_failure_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WebhookListResponse(BaseModel):
    items: List[WebhookResponse]
    total: int


class WebhookDeliveryResponse(BaseModel):
    id: int
    event: str
    payload: str
    response_status: Optional[int]
    response_body: Optional[str]
    error_message: Optional[str]
    delivered_at: datetime
    duration_ms: Optional[int]
    attempt_number: int
    is_success: bool

    class Config:
        from_attributes = True


class WebhookDeliveryListResponse(BaseModel):
    items: List[WebhookDeliveryResponse]
    total: int
    page: int
    page_size: int


# ---- Endpoints ----

@router.get("/webhooks", response_model=WebhookListResponse, tags=["Webhooks"])
def list_webhooks(
    event: Optional[str] = Query(None, description="Filter by event type"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all webhooks for the organization."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    query = db.query(models.Webhook).filter(models.Webhook.organization_id == org_id)

    if event:
        query = query.filter(models.Webhook.event == event)

    webhooks = query.order_by(models.Webhook.created_at.desc()).all()

    return WebhookListResponse(
        items=[WebhookResponse.model_validate(w) for w in webhooks],
        total=len(webhooks),
    )


@router.post("/webhooks", response_model=WebhookResponse, status_code=201, tags=["Webhooks"])
def create_webhook(
    req: WebhookCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new webhook subscription.

    The webhook will receive POST requests with JSON payloads when the specified event occurs.
    A secret is automatically generated for signature verification.
    """
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Check for existing webhook with same URL and event
    existing = db.query(models.Webhook).filter(
        models.Webhook.organization_id == org_id,
        models.Webhook.url == str(req.url),
        models.Webhook.event == req.event,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Webhook already exists for this URL and event (id={existing.id})"
        )

    # Generate a secret for HMAC signature verification
    secret = secrets.token_urlsafe(32)

    webhook = models.Webhook(
        organization_id=org_id,
        url=str(req.url),
        event=req.event,
        description=req.description,
        secret=secret,
        created_by_user_id=current_user.id,
    )

    db.add(webhook)
    db.commit()
    db.refresh(webhook)

    logger.info(
        f"Webhook created: org={org_id} event={req.event} url={req.url}",
        extra={"event": "webhook_created", "org_id": org_id, "webhook_id": webhook.id}
    )

    return WebhookResponse.model_validate(webhook)


@router.get("/webhooks/events", response_model=List[dict], tags=["Webhooks"])
def list_webhook_events():
    """List all available webhook event types."""
    events = [
        {"event": models.WEBHOOK_EVENT_LEAD_CREATED, "description": "Fires when a new lead is created"},
        {"event": models.WEBHOOK_EVENT_LEAD_UPDATED, "description": "Fires when a lead is updated"},
        {"event": models.WEBHOOK_EVENT_FORM_SUBMITTED, "description": "Fires when a form is submitted"},
        {"event": models.WEBHOOK_EVENT_CHAT_STARTED, "description": "Fires when an AI chat conversation starts"},
        {"event": models.WEBHOOK_EVENT_CHAT_LEAD_CAPTURED, "description": "Fires when AI chat captures lead info"},
    ]
    return events


@router.get("/webhooks/{webhook_id}", response_model=WebhookResponse, tags=["Webhooks"])
def get_webhook(
    webhook_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get webhook details by ID."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.organization_id == org_id,
    ).first()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    return WebhookResponse.model_validate(webhook)


@router.delete("/webhooks/{webhook_id}", status_code=204, tags=["Webhooks"])
def delete_webhook(
    webhook_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a webhook subscription."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.organization_id == org_id,
    ).first()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    logger.info(
        f"Webhook deleted: org={org_id} event={webhook.event} url={webhook.url}",
        extra={"event": "webhook_deleted", "org_id": org_id, "webhook_id": webhook_id}
    )

    db.delete(webhook)
    db.commit()

    return None


@router.get("/webhooks/{webhook_id}/deliveries", response_model=WebhookDeliveryListResponse, tags=["Webhooks"])
def list_webhook_deliveries(
    webhook_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get delivery logs for a webhook (for debugging)."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Verify webhook belongs to org
    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.organization_id == org_id,
    ).first()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    # Get total count
    total = db.query(models.WebhookDelivery).filter(
        models.WebhookDelivery.webhook_id == webhook_id
    ).count()

    # Get paginated deliveries
    deliveries = db.query(models.WebhookDelivery).filter(
        models.WebhookDelivery.webhook_id == webhook_id
    ).order_by(
        models.WebhookDelivery.delivered_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()

    return WebhookDeliveryListResponse(
        items=[WebhookDeliveryResponse.model_validate(d) for d in deliveries],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/webhooks/{webhook_id}/test", tags=["Webhooks"])
async def test_webhook(
    webhook_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a test payload to the webhook."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.organization_id == org_id,
    ).first()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    # Import webhook service
    from app.services.webhook_service import fire_webhook_sync

    # Create test payload
    test_payload = {
        "event": webhook.event,
        "test": True,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "message": "This is a test webhook delivery from Site2CRM",
            "webhook_id": webhook.id,
        }
    }

    # Fire the webhook synchronously for immediate feedback
    success, status_code, response_body, error = fire_webhook_sync(
        db=db,
        webhook=webhook,
        payload=test_payload,
    )

    return {
        "success": success,
        "status_code": status_code,
        "response_body": response_body[:500] if response_body else None,
        "error": error,
    }
