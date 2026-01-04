from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Header, Body
from sqlalchemy.orm import Session
import sqlalchemy as sa

from app.db.session import SessionLocal
from app.db import models
from app.schemas.lead import LeadCreate
from app.crud import lead as lead_crud
from app.api.routes.auth import get_current_user  # reuse auth dependency

# CRM integrations
from app.integrations.hubspot import create_lead_full as hubspot_create_lead_full
from app.integrations import nutshell
from app.integrations.pipedrive import create_lead as pipedrive_create_lead
from app.integrations.salesforce import create_lead as salesforce_create_lead

# Email notifications
from app.services.email import send_new_lead_notification, send_crm_error_notification

# Lead processing (sanitization, spam, dedupe)
from app.services.lead_processing import process_lead, sanitize_string

# Notification settings helper
from app.api.routes.integrations_notifications import get_org_notification_settings

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ---- CRM Sync Wrappers with Error Notifications ----

async def _sync_to_hubspot_with_notification(
    org_id: int,
    org_name: Optional[str],
    lead_name: str,
    email: str,
    first_name: str,
    last_name: str,
    phone: str,
    company: str = "",
):
    """Sync lead to HubSpot with full entity creation (contact + company + association)."""
    try:
        await hubspot_create_lead_full(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            company_name=company,
            organization_id=org_id,
        )
    except Exception as exc:
        logger.error(f"HubSpot sync failed for org {org_id}: {exc}")
        _maybe_send_crm_error_notification(org_id, org_name, "hubspot", str(exc), lead_name)


async def _sync_to_pipedrive_with_notification(
    org_id: int,
    org_name: Optional[str],
    lead_name: str,
    title: str,
    name: str,
    email: str,
):
    """Sync lead to Pipedrive, sending error notification on failure if enabled."""
    try:
        result = await pipedrive_create_lead(
            title=title,
            name=name,
            email=email,
            organization_id=org_id,
        )
        if result is None:
            logger.error(f"Pipedrive sync failed for org {org_id}: returned None")
            _maybe_send_crm_error_notification(
                org_id, org_name, "pipedrive",
                "Failed to create lead in Pipedrive. Check API credentials.",
                lead_name,
            )
    except Exception as exc:
        logger.error(f"Pipedrive sync failed for org {org_id}: {exc}")
        _maybe_send_crm_error_notification(org_id, org_name, "pipedrive", str(exc), lead_name)


async def _sync_to_salesforce_with_notification(
    org_id: int,
    org_name: Optional[str],
    lead_name: str,
    email: str,
    first_name: str,
    last_name: str,
    company: str,
):
    """Sync lead to Salesforce, sending error notification on failure if enabled."""
    try:
        await salesforce_create_lead(
            org_id=org_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            company=company,
        )
    except Exception as exc:
        logger.error(f"Salesforce sync failed for org {org_id}: {exc}")
        _maybe_send_crm_error_notification(org_id, org_name, "salesforce", str(exc), lead_name)


async def _sync_to_nutshell_with_notification(
    org_id: int,
    org_name: Optional[str],
    lead_name: str,
    description: str,
    contact_name: str,
    contact_email: str,
):
    """Sync lead to Nutshell, sending error notification on failure if enabled."""
    try:
        await nutshell.create_lead(
            description=description,
            contact_name=contact_name,
            contact_email=contact_email,
        )
    except Exception as exc:
        logger.error(f"Nutshell sync failed for org {org_id}: {exc}")
        _maybe_send_crm_error_notification(org_id, org_name, "nutshell", str(exc), lead_name)


def _maybe_send_crm_error_notification(
    org_id: int,
    org_name: Optional[str],
    crm_provider: str,
    error_message: str,
    lead_name: Optional[str],
):
    """Check notification settings and send CRM error notification if enabled."""
    db = SessionLocal()
    try:
        notification_settings = get_org_notification_settings(db, org_id)
        should_notify = (
            notification_settings is None  # Default: enabled
            or notification_settings.crm_error
        )

        if not should_notify:
            return

        recipients = [
            user.email
            for user in db.query(models.User)
            .filter(models.User.organization_id == org_id)
            .all()
            if user.email
        ]

        if recipients:
            send_crm_error_notification(
                recipients=recipients,
                crm_provider=crm_provider,
                error_message=error_message,
                lead_name=lead_name,
                organization_name=org_name,
            )
    finally:
        db.close()


# Local DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---- Public lead intake ----
# Known fields that map to Lead model columns
KNOWN_LEAD_FIELDS = {"name", "email", "phone", "company", "notes", "source", "first_name", "last_name"}

@router.post("/public/leads", response_model=dict)
def public_create_lead(
    background_tasks: BackgroundTasks,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    x_org_key: Optional[str] = Header(None, alias="X-Org-Key"),
):
    if not x_org_key:
        raise HTTPException(status_code=401, detail="Missing X-Org-Key")

    org = db.query(models.Organization).filter(models.Organization.api_key == x_org_key).first()
    if not org:
        raise HTTPException(status_code=401, detail="Invalid X-Org-Key")

    # Extract known fields and custom fields
    known_data = {}
    custom_fields = {}

    for key, value in payload.items():
        if key in KNOWN_LEAD_FIELDS:
            known_data[key] = value
        elif key not in ("organization_id",) and value:  # Skip org_id, keep non-empty custom fields
            custom_fields[key] = sanitize_string(str(value), max_length=500)

    # Append custom fields to notes
    existing_notes = known_data.get("notes", "") or ""
    if custom_fields:
        custom_notes = "\n".join(f"{k}: {v}" for k, v in custom_fields.items())
        if existing_notes:
            known_data["notes"] = f"{existing_notes}\n\n--- Additional Info ---\n{custom_notes}"
        else:
            known_data["notes"] = custom_notes

    # Process lead: sanitize, spam check, rate limit, dedupe
    sanitized_data, rejection_reason, existing_lead = process_lead(
        db=db,
        org_id=org.id,
        data=known_data,
        dedupe_window_hours=24,      # Dedupe within 24 hours
        rate_limit_window_minutes=5,  # Max 3 submissions per 5 minutes
        rate_limit_max=3,
    )

    # Check for rejection (spam, rate limit, invalid data)
    if rejection_reason:
        # Log but don't expose spam detection details to potential spammers
        if "Spam" in rejection_reason or "Rate limited" in rejection_reason:
            # Return success to not tip off spammers, but don't save
            return {"message": "Lead received", "lead_id": 0}
        # Other validation errors can be returned
        raise HTTPException(status_code=422, detail=rejection_reason)

    # If duplicate was found and merged, use existing lead
    if existing_lead:
        db_lead = existing_lead
        is_new = False
    else:
        # Check lead limit before creating
        allowed, current_count, limit = lead_crud.check_lead_limit(db, org.id)
        if not allowed:
            # Soft limit: still accept the lead but flag it
            # In a hard limit scenario, you could raise an HTTPException here
            logger.warning(f"Org {org.id} exceeded lead limit ({current_count}/{limit})")

        # Create new lead with sanitized data
        lead = LeadCreate(**{k: v for k, v in sanitized_data.items() if k in KNOWN_LEAD_FIELDS or k == "organization_id"})
        db_lead = lead_crud.create_lead(db, lead)
        is_new = True

    # Only sync to CRM and send notifications for NEW leads (not duplicates)
    if is_new:
        provider = (org.active_crm or "hubspot").lower()

        # Common fields
        email = db_lead.email
        first_name = getattr(db_lead, "first_name", None) or ""
        last_name = getattr(db_lead, "last_name", None) or ""
        phone = getattr(db_lead, "phone", None) or ""
        company = getattr(db_lead, "company", None) or ""
        name_field = getattr(db_lead, "name", None) or ""
        display_name = name_field or f"{first_name} {last_name}".strip() or email

        org_name = getattr(org, "name", None)

        # HubSpot: create contact + company + association
        if provider == "hubspot":
            background_tasks.add_task(
                _sync_to_hubspot_with_notification,
                org_id=org.id,
                org_name=org_name,
                lead_name=display_name,
                email=email,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                company=company,
            )

        # Pipedrive: person plus lead
        elif provider == "pipedrive":
            title = f"{db_lead.source or 'Site2CRM'} lead from {email}"
            background_tasks.add_task(
                _sync_to_pipedrive_with_notification,
                org_id=org.id,
                org_name=org_name,
                lead_name=display_name,
                title=title,
                name=display_name,
                email=email,
            )

        # Salesforce: Lead sObject
        elif provider == "salesforce":
            background_tasks.add_task(
                _sync_to_salesforce_with_notification,
                org_id=org.id,
                org_name=org_name,
                lead_name=display_name,
                email=email,
                first_name=first_name,
                last_name=last_name,
                company=company,
            )

        # Nutshell: JSON RPC newLead
        elif provider == "nutshell":
            description = f"{db_lead.source or 'Site2CRM'} lead from {email}"
            background_tasks.add_task(
                _sync_to_nutshell_with_notification,
                org_id=org.id,
                org_name=org_name,
                lead_name=display_name,
                description=description,
                contact_name=display_name,
                contact_email=email,
            )

        # Email notifications to organization users (only for new leads, if enabled)
        notification_settings = get_org_notification_settings(db, org.id)
        should_send_new_lead_email = (
            notification_settings is None  # Default: enabled
            or notification_settings.new_lead
        )

        if should_send_new_lead_email:
            recipients = [
                user.email
                for user in db.query(models.User)
                .filter(models.User.organization_id == org.id)
                .all()
                if user.email
            ]

            if recipients:
                background_tasks.add_task(
                    send_new_lead_notification,
                    recipients,
                    display_name or email or "New lead",
                    db_lead.email,
                    company,
                    db_lead.source,
                    org_name,
                )

    # Return appropriate message
    if is_new:
        return {"message": "Lead received", "lead_id": db_lead.id}
    else:
        return {"message": "Lead updated", "lead_id": db_lead.id, "merged": True}


# ---- Internal leads list ----
def _lead_to_dict(l):
    return {
        "id": getattr(l, "id", None),
        "name": getattr(l, "name", None),
        "first_name": getattr(l, "first_name", None),
        "last_name": getattr(l, "last_name", None),
        "email": getattr(l, "email", None),
        "phone": getattr(l, "phone", None),
        "company": getattr(l, "company", None),
        "source": getattr(l, "source", None),
        "notes": getattr(l, "notes", None),
        "organization_id": getattr(l, "organization_id", None),
        "created_at": getattr(l, "created_at", None).isoformat() if getattr(l, "created_at", None) else None,
    }


@router.get("/leads")
def get_leads(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
):
    organization_id = current_user.organization_id
    if organization_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    items: List[models.Lead] = lead_crud.get_leads(db, organization_id=organization_id)

    if q:
        q_lower = q.lower()

        def _hit(l: models.Lead) -> bool:
            return any(
                (getattr(l, f) or "").lower().find(q_lower) >= 0
                for f in ("email", "name", "first_name", "last_name", "phone", "company", "source", "notes")
            )

        items = [i for i in items if _hit(i)]

    reverse = dir.lower() == "desc"

    def _key(l: models.Lead):
        v = getattr(l, sort, None)
        return (v is None, v)

    try:
        items.sort(key=_key, reverse=reverse)
    except Exception:
        items.sort(
            key=lambda l: (getattr(l, "created_at", None) is None, getattr(l, "created_at", None)),
            reverse=True,
        )

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return {
        "items": [_lead_to_dict(i) for i in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": end < total,
        "has_prev": page > 1,
        "sort": sort,
        "dir": dir,
        "q": q or "",
        "organization_id": organization_id,
    }


# ---- Dashboard metrics ----
@router.get("/dashboard/metrics", response_model=dict)
def dashboard_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    total = db.query(models.Lead).filter(models.Lead.organization_id == org_id).count()
    by_source_rows = (
        db.query(models.Lead.source, sa.func.count(models.Lead.id))
        .filter(models.Lead.organization_id == org_id)
        .group_by(models.Lead.source)
        .all()
    )
    by_source = {k or "unknown": v for k, v in by_source_rows}

    return {"total": total, "by_source": by_source}
