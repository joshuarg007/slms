"""
Public contact form endpoint for marketing site
"""
from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from app.services.email import send_contact_form_notification
from app.core.rate_limit import check_rate_limit
from app.core.captcha import verify_captcha_sync

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contact"])

# Team members to notify about contact form submissions
CONTACT_NOTIFICATION_RECIPIENTS = ["support@site2crm.io"]


class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None
    captcha_token: Optional[str] = None


@router.post("/contact")
def submit_contact_form(
    request: Request,
    data: ContactFormRequest,
    background_tasks: BackgroundTasks,
):
    """
    Public endpoint for contact form submissions from the marketing site.
    Rate limited to 5 requests per hour per IP.
    Protected by reCAPTCHA v3 when configured.
    """
    # Check rate limit
    check_rate_limit(request, "contact")

    # Verify CAPTCHA (skipped if not configured)
    verify_captcha_sync(data.captcha_token, action="contact")

    # Queue email notification in background
    background_tasks.add_task(
        send_contact_form_notification,
        recipients=CONTACT_NOTIFICATION_RECIPIENTS,
        name=data.name,
        email=data.email,
        company=data.company,
        message=data.message,
        source=data.source,
    )

    return {"status": "ok", "message": "Thank you for your message. We'll be in touch soon."}
