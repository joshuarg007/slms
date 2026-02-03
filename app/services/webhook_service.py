# app/services/webhook_service.py
"""
Webhook delivery service for Site2CRM.

Handles firing webhooks to registered URLs when events occur.
Includes HMAC signature verification, delivery logging, and async execution.
"""
import json
import hmac
import hashlib
import time
from datetime import datetime
from typing import Optional, Any
import httpx

from sqlalchemy.orm import Session

from app.db import models
from app.db.session import SessionLocal

import logging

logger = logging.getLogger(__name__)

# Timeout for webhook delivery (seconds)
WEBHOOK_TIMEOUT = 10

# Max response body to store (characters)
MAX_RESPONSE_BODY = 1000


def generate_signature(payload: dict, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload."""
    payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    signature = hmac.new(
        secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"


def fire_webhook_sync(
    db: Session,
    webhook: models.Webhook,
    payload: dict,
    attempt: int = 1,
) -> tuple[bool, Optional[int], Optional[str], Optional[str]]:
    """
    Fire a webhook synchronously (used for testing).

    Returns: (success, status_code, response_body, error_message)
    """
    start_time = time.time()
    status_code = None
    response_body = None
    error_message = None
    success = False

    try:
        # Build headers
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Site2CRM-Webhook/1.0",
            "X-Site2CRM-Event": payload.get("event", "unknown"),
            "X-Site2CRM-Delivery": str(datetime.utcnow().timestamp()),
        }

        # Add signature if secret exists
        if webhook.secret:
            headers["X-Site2CRM-Signature"] = generate_signature(payload, webhook.secret)

        # Make the request
        with httpx.Client(timeout=WEBHOOK_TIMEOUT) as client:
            response = client.post(
                webhook.url,
                json=payload,
                headers=headers,
            )
            status_code = response.status_code
            response_body = response.text[:MAX_RESPONSE_BODY] if response.text else None
            success = 200 <= status_code < 300

    except httpx.TimeoutException:
        error_message = "Request timed out"
    except httpx.ConnectError as e:
        error_message = f"Connection error: {str(e)[:200]}"
    except Exception as e:
        error_message = f"Unexpected error: {str(e)[:200]}"

    # Calculate duration
    duration_ms = int((time.time() - start_time) * 1000)

    # Log delivery attempt
    delivery = models.WebhookDelivery(
        webhook_id=webhook.id,
        event=payload.get("event", "unknown"),
        payload=json.dumps(payload),
        response_status=status_code,
        response_body=response_body,
        error_message=error_message,
        duration_ms=duration_ms,
        attempt_number=attempt,
        is_success=success,
    )
    db.add(delivery)

    # Update webhook stats
    webhook.total_deliveries = (webhook.total_deliveries or 0) + 1
    webhook.last_delivery_at = datetime.utcnow()

    if success:
        webhook.successful_deliveries = (webhook.successful_deliveries or 0) + 1
        webhook.last_success_at = datetime.utcnow()
    else:
        webhook.failed_deliveries = (webhook.failed_deliveries or 0) + 1
        webhook.last_failure_at = datetime.utcnow()
        webhook.last_failure_reason = error_message or f"HTTP {status_code}"

    db.commit()

    return success, status_code, response_body, error_message


async def fire_webhook_async(
    webhook_id: int,
    payload: dict,
    attempt: int = 1,
):
    """
    Fire a webhook asynchronously.
    Called from background tasks.
    """
    db = SessionLocal()
    try:
        webhook = db.query(models.Webhook).filter(
            models.Webhook.id == webhook_id,
            models.Webhook.is_active == True,
        ).first()

        if not webhook:
            logger.warning(f"Webhook {webhook_id} not found or inactive")
            return

        start_time = time.time()
        status_code = None
        response_body = None
        error_message = None
        success = False

        try:
            # Build headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "Site2CRM-Webhook/1.0",
                "X-Site2CRM-Event": payload.get("event", "unknown"),
                "X-Site2CRM-Delivery": str(datetime.utcnow().timestamp()),
            }

            # Add signature if secret exists
            if webhook.secret:
                headers["X-Site2CRM-Signature"] = generate_signature(payload, webhook.secret)

            # Make the request
            async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT) as client:
                response = await client.post(
                    webhook.url,
                    json=payload,
                    headers=headers,
                )
                status_code = response.status_code
                response_body = response.text[:MAX_RESPONSE_BODY] if response.text else None
                success = 200 <= status_code < 300

        except httpx.TimeoutException:
            error_message = "Request timed out"
        except httpx.ConnectError as e:
            error_message = f"Connection error: {str(e)[:200]}"
        except Exception as e:
            error_message = f"Unexpected error: {str(e)[:200]}"

        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)

        # Log delivery attempt
        delivery = models.WebhookDelivery(
            webhook_id=webhook.id,
            event=payload.get("event", "unknown"),
            payload=json.dumps(payload),
            response_status=status_code,
            response_body=response_body,
            error_message=error_message,
            duration_ms=duration_ms,
            attempt_number=attempt,
            is_success=success,
        )
        db.add(delivery)

        # Update webhook stats
        webhook.total_deliveries = (webhook.total_deliveries or 0) + 1
        webhook.last_delivery_at = datetime.utcnow()

        if success:
            webhook.successful_deliveries = (webhook.successful_deliveries or 0) + 1
            webhook.last_success_at = datetime.utcnow()
            logger.info(
                f"Webhook delivered: id={webhook.id} event={payload.get('event')} status={status_code}",
                extra={"event": "webhook_delivered", "webhook_id": webhook.id, "status": status_code}
            )
        else:
            webhook.failed_deliveries = (webhook.failed_deliveries or 0) + 1
            webhook.last_failure_at = datetime.utcnow()
            webhook.last_failure_reason = error_message or f"HTTP {status_code}"
            logger.warning(
                f"Webhook failed: id={webhook.id} event={payload.get('event')} error={error_message or status_code}",
                extra={"event": "webhook_failed", "webhook_id": webhook.id, "error": error_message}
            )

        db.commit()

    finally:
        db.close()


def fire_webhooks_for_event(
    org_id: int,
    event: str,
    data: dict,
    background_tasks: Any = None,
):
    """
    Fire all webhooks registered for an event.

    Args:
        org_id: Organization ID
        event: Event type (e.g., "lead.created")
        data: Event data to include in payload
        background_tasks: FastAPI BackgroundTasks for async execution
    """
    db = SessionLocal()
    try:
        # Find all active webhooks for this org and event
        webhooks = db.query(models.Webhook).filter(
            models.Webhook.organization_id == org_id,
            models.Webhook.event == event,
            models.Webhook.is_active == True,
        ).all()

        if not webhooks:
            return

        # Build payload
        payload = {
            "event": event,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
        }

        # Fire each webhook
        for webhook in webhooks:
            if background_tasks:
                # Async execution
                background_tasks.add_task(
                    fire_webhook_async,
                    webhook_id=webhook.id,
                    payload=payload,
                )
            else:
                # Sync execution (for testing or when no background tasks available)
                fire_webhook_sync(db, webhook, payload)

        logger.info(
            f"Queued {len(webhooks)} webhooks for event {event}",
            extra={"event": "webhooks_queued", "org_id": org_id, "webhook_event": event, "count": len(webhooks)}
        )

    finally:
        db.close()


# ---- Convenience functions for specific events ----

def fire_lead_created_webhook(
    org_id: int,
    lead: models.Lead,
    source: str = "form",
    background_tasks: Any = None,
):
    """Fire webhook when a new lead is created."""
    data = {
        "lead_id": lead.id,
        "email": lead.email,
        "name": lead.name,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "phone": lead.phone,
        "company": lead.company,
        "source": lead.source or source,
        "notes": lead.notes,
        "utm_source": lead.utm_source,
        "utm_medium": lead.utm_medium,
        "utm_campaign": lead.utm_campaign,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }
    fire_webhooks_for_event(org_id, models.WEBHOOK_EVENT_LEAD_CREATED, data, background_tasks)


def fire_lead_updated_webhook(
    org_id: int,
    lead: models.Lead,
    changed_fields: list[str],
    background_tasks: Any = None,
):
    """Fire webhook when a lead is updated."""
    data = {
        "lead_id": lead.id,
        "email": lead.email,
        "name": lead.name,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "phone": lead.phone,
        "company": lead.company,
        "status": lead.status,
        "deal_value": str(lead.deal_value) if lead.deal_value else None,
        "notes": lead.notes,
        "changed_fields": changed_fields,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }
    fire_webhooks_for_event(org_id, models.WEBHOOK_EVENT_LEAD_UPDATED, data, background_tasks)


def fire_form_submitted_webhook(
    org_id: int,
    lead: models.Lead,
    form_config: models.FormConfig,
    background_tasks: Any = None,
):
    """Fire webhook when a form is submitted."""
    data = {
        "lead_id": lead.id,
        "form_id": form_config.id,
        "form_name": form_config.name,
        "form_key": form_config.form_key,
        "email": lead.email,
        "name": lead.name,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "phone": lead.phone,
        "company": lead.company,
        "notes": lead.notes,
        "utm_source": lead.utm_source,
        "utm_medium": lead.utm_medium,
        "utm_campaign": lead.utm_campaign,
        "landing_page_url": lead.landing_page_url,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }
    fire_webhooks_for_event(org_id, models.WEBHOOK_EVENT_FORM_SUBMITTED, data, background_tasks)


def fire_chat_started_webhook(
    org_id: int,
    conversation: models.ChatWidgetConversation,
    config: models.ChatWidgetConfig,
    background_tasks: Any = None,
):
    """Fire webhook when a chat conversation starts."""
    data = {
        "conversation_id": conversation.id,
        "session_id": conversation.session_id,
        "widget_id": config.id,
        "widget_key": config.widget_key,
        "business_name": config.business_name,
        "page_url": conversation.page_url,
        "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
    }
    fire_webhooks_for_event(org_id, models.WEBHOOK_EVENT_CHAT_STARTED, data, background_tasks)


def fire_chat_lead_captured_webhook(
    org_id: int,
    conversation: models.ChatWidgetConversation,
    config: models.ChatWidgetConfig,
    background_tasks: Any = None,
):
    """Fire webhook when chat captures lead info (email/phone)."""
    data = {
        "conversation_id": conversation.id,
        "session_id": conversation.session_id,
        "widget_id": config.id,
        "widget_key": config.widget_key,
        "business_name": config.business_name,
        "email": conversation.lead_email,
        "name": conversation.lead_name,
        "phone": conversation.lead_phone,
        "page_url": conversation.page_url,
        "message_count": conversation.message_count,
        "captured_at": conversation.lead_captured_at.isoformat() if conversation.lead_captured_at else None,
    }
    fire_webhooks_for_event(org_id, models.WEBHOOK_EVENT_CHAT_LEAD_CAPTURED, data, background_tasks)
