"""
Public contact form endpoint for marketing site
"""
from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from app.services.email import send_contact_form_notification
from app.core.rate_limit import check_rate_limit
from app.core.captcha import verify_captcha
from app.integrations.hubspot import create_marketing_contact
from app.db.session import SessionLocal
from app.db.models import Lead, Organization

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contact"])

# Team members to notify about contact form submissions
CONTACT_NOTIFICATION_RECIPIENTS = ["support@site2crm.io"]

# Site2CRM org for internal lead tracking
SITE2CRM_ORG_API_KEY = "org_jUITQNG0ZcPF_KJ0vplRQV8rwWk0pvR9"


class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None
    captcha_token: Optional[str] = None


def _save_lead_to_site2crm(name: str, email: str, company: str, message: str, source: str):
    """Save contact form submission as a lead in Site2CRM's own database."""
    try:
        db = SessionLocal()
        # Find the org by API key
        org = db.query(Organization).filter(Organization.api_key == SITE2CRM_ORG_API_KEY).first()
        if not org:
            logger.warning(f"Site2CRM org not found for API key: {SITE2CRM_ORG_API_KEY}")
            db.close()
            return

        # Create the lead
        lead = Lead(
            organization_id=org.id,
            name=name,
            email=email,
            company=company or None,
            notes=message,
            source=source,
        )
        db.add(lead)
        db.commit()
        logger.info(f"Lead saved to Site2CRM: {email} (source: {source})")
        db.close()
    except Exception as exc:
        logger.error(f"Failed to save lead to Site2CRM for {email}: {exc}")


async def _sync_to_hubspot(name: str, email: str, company: str, source: str):
    """Push contact form submission to HubSpot using global API key."""
    try:
        # Parse name into first/last
        parts = name.strip().split(maxsplit=1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

        result = await create_marketing_contact(
            email=email,
            first_name=first_name,
            last_name=last_name,
            company_name=company or "",
            source=source,
        )
        if "error" in result:
            logger.error(f"HubSpot sync failed for contact {email}: {result['error']}")
        else:
            logger.info(f"HubSpot sync successful for contact: {email} (source: {source})")
    except Exception as exc:
        logger.error(f"HubSpot sync failed for contact {email}: {exc}")


@router.post("/contact")
async def submit_contact_form(
    request: Request,
    data: ContactFormRequest,
    background_tasks: BackgroundTasks,
):
    """
    Public endpoint for contact form submissions from the marketing site.
    Rate limited to 5 requests per hour per IP.
    Protected by reCAPTCHA v3 when configured.
    Syncs to HubSpot for lead tracking.
    """
    # Check rate limit
    check_rate_limit(request, "contact")

    # Verify CAPTCHA (skipped if not configured)
    await verify_captcha(data.captcha_token, action="contact")

    # Determine source for HubSpot tracking
    source = data.source or "site2crm.io/contact"

    # Queue email notification in background
    background_tasks.add_task(
        send_contact_form_notification,
        recipients=CONTACT_NOTIFICATION_RECIPIENTS,
        name=data.name,
        email=data.email,
        company=data.company,
        message=data.message,
        source=source,
    )

    # Also sync to HubSpot for lead tracking
    background_tasks.add_task(
        _sync_to_hubspot,
        name=data.name,
        email=data.email,
        company=data.company or "",
        source=source,
    )

    # Save lead to Site2CRM's own database
    background_tasks.add_task(
        _save_lead_to_site2crm,
        name=data.name,
        email=data.email,
        company=data.company or "",
        message=data.message or "",
        source=source,
    )

    return {"status": "ok", "message": "Thank you for your message. We'll be in touch soon."}
