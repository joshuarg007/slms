"""
Support request endpoint for authenticated users
"""
from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from app.api.deps.auth import get_current_user
from app.db.models import User, Organization
from app.services.email import send_support_request_notification
from sqlalchemy.orm import Session
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["support"])

# Support team recipients
SUPPORT_RECIPIENTS = [
    "joshuarg007@gmail.com",
    "labs@axiondeep.com",
    "cgutierrez1145@gmail.com",
]


class SupportRequest(BaseModel):
    issue_type: str
    issue_label: str
    details: str
    contact_email: Optional[str] = None


@router.post("/support/request")
async def submit_support_request(
    data: SupportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a support request from an authenticated user.
    Sends email notifications to the support team.
    """
    # Get user's organization name
    org_name = None
    if current_user.organization_id:
        org = db.query(Organization).filter(
            Organization.id == current_user.organization_id
        ).first()
        if org:
            org_name = org.name

    # Use contact_email if provided, otherwise use user's email
    contact_email = data.contact_email or current_user.email

    # Queue email notification in background
    background_tasks.add_task(
        send_support_request_notification,
        recipients=SUPPORT_RECIPIENTS,
        issue_type=data.issue_type,
        issue_label=data.issue_label,
        details=data.details,
        user_email=contact_email,
        user_name=current_user.email.split("@")[0],  # Simple name from email
        organization_name=org_name,
    )

    logger.info(f"Support request submitted by {current_user.email}: {data.issue_type}")

    return {
        "status": "ok",
        "message": "Support request submitted successfully. We'll get back to you within 24 hours.",
    }
