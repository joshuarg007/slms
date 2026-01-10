from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Header, Body
from sqlalchemy.orm import Session
import sqlalchemy as sa

from app.db.session import SessionLocal
from app.db import models
from app.schemas.lead import LeadCreate
from app.crud import lead as lead_crud
from app.api.routes.auth import get_current_user  # reuse auth dependency

# CRM integrations
from app.integrations.hubspot import (
    create_lead_full as hubspot_create_lead_full,
    fetch_all_contacts as hubspot_fetch_all_contacts,
)
from app.integrations import nutshell
from app.integrations.pipedrive import create_lead as pipedrive_create_lead
from app.integrations.salesforce import create_lead as salesforce_create_lead
from app.integrations.zoho import create_lead as zoho_create_lead

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


async def _sync_to_zoho_with_notification(
    org_id: int,
    org_name: Optional[str],
    lead_name: str,
    email: str,
    first_name: str,
    last_name: str,
    company: str = "",
    phone: str = "",
):
    """Sync lead to Zoho CRM, sending error notification on failure if enabled."""
    try:
        await zoho_create_lead(
            title=f"Lead from {email}",
            name=f"{first_name} {last_name}".strip() or email,
            email=email,
            company=company,
            phone=phone,
            organization_id=org_id,
        )
    except Exception as exc:
        logger.error(f"Zoho sync failed for org {org_id}: {exc}")
        _maybe_send_crm_error_notification(org_id, org_name, "zoho", str(exc), lead_name)


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
KNOWN_LEAD_FIELDS = {
    "name", "email", "phone", "company", "notes", "source", "first_name", "last_name",
    # UTM tracking fields
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "referrer_url", "landing_page_url",
    # A/B test tracking
    "form_variant_id",
}

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
        allowed, current_count, limit, is_hard_limit = lead_crud.check_lead_limit(db, org.id)
        if not allowed:
            if is_hard_limit:
                # Hard limit (AppSumo): reject with friendly user message
                raise HTTPException(
                    status_code=429,
                    detail="You've reached your monthly lead limit. Your limit resets on the 1st of next month. Need more capacity? Contact us to discuss options.",
                    headers={"Retry-After": "86400"}  # Suggest retry in 24 hours
                )
            else:
                # Soft limit: accept the lead but log warning
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

        # Zoho: REST API Lead creation
        elif provider == "zoho":
            background_tasks.add_task(
                _sync_to_zoho_with_notification,
                org_id=org.id,
                org_name=org_name,
                lead_name=display_name,
                email=email,
                first_name=first_name,
                last_name=last_name,
                company=company,
                phone=phone,
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
def _lead_to_dict(l, crm_source: Optional[str] = None, is_crm_only: bool = False):
    """Convert lead model or dict to response dict with source tracking."""
    if isinstance(l, dict):
        # CRM-only lead (from HubSpot, etc.)
        name = f"{l.get('first_name', '')} {l.get('last_name', '')}".strip() or l.get('email', '')
        created_at = l.get('created_at')
        if created_at and isinstance(created_at, str):
            # Keep as ISO string
            pass
        elif created_at:
            created_at = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)

        return {
            "id": l.get("hubspot_id") or l.get("id"),
            "name": name,
            "first_name": l.get("first_name"),
            "last_name": l.get("last_name"),
            "email": l.get("email"),
            "phone": l.get("phone"),
            "company": l.get("company"),
            "source": crm_source or "hubspot",
            "notes": None,
            "organization_id": None,
            "created_at": created_at,
            "crm_source": crm_source,
            "is_crm_only": True,
        }

    # Local database lead
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
        "crm_source": crm_source,
        "is_crm_only": False,
        # UTM tracking fields
        "utm_source": getattr(l, "utm_source", None),
        "utm_medium": getattr(l, "utm_medium", None),
        "utm_campaign": getattr(l, "utm_campaign", None),
        "utm_term": getattr(l, "utm_term", None),
        "utm_content": getattr(l, "utm_content", None),
        "referrer_url": getattr(l, "referrer_url", None),
        "landing_page_url": getattr(l, "landing_page_url", None),
    }


def _dedupe_leads(
    local_leads: List[models.Lead],
    crm_leads: List[Dict[str, Any]],
    crm_name: str,
) -> tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
    """
    Merge local and CRM leads with deduplication by email.

    Returns:
        - merged_items: List of lead dicts with source tracking
        - duplicates: List of duplicate recommendations (emails found in both)

    Rules:
        - Local leads are primary (never delete from CRM)
        - CRM-only leads are added with crm_source flag
        - Duplicates are flagged for recommendation
    """
    merged: List[Dict[str, Any]] = []
    duplicates: List[Dict[str, str]] = []
    seen_emails: set = set()

    # Process local leads first (they take priority)
    for lead in local_leads:
        email = (getattr(lead, "email", "") or "").lower().strip()
        if email:
            seen_emails.add(email)
        merged.append(_lead_to_dict(lead, crm_source="local", is_crm_only=False))

    # Process CRM leads - add only if not already in local
    for crm_lead in crm_leads:
        email = (crm_lead.get("email", "") or "").lower().strip()
        if not email:
            continue

        if email in seen_emails:
            # Duplicate found - recommend dedupe in HubSpot
            duplicates.append({
                "email": email,
                "crm": crm_name,
                "recommendation": f"Lead exists in both local and {crm_name}. Consider deduping in {crm_name} (we never delete from CRM, only add).",
            })
        else:
            # New lead from CRM only
            seen_emails.add(email)
            merged.append(_lead_to_dict(crm_lead, crm_source=crm_name, is_crm_only=True))

    return merged, duplicates


@router.get("/leads")
async def get_leads(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    include_crm: bool = Query(True, description="Include leads from connected CRM"),
    utm_source: Optional[str] = Query(None, description="Filter by UTM source"),
    utm_medium: Optional[str] = Query(None, description="Filter by UTM medium"),
):
    """
    Get leads with optional CRM sync.

    When include_crm=True (default):
    - Fetches leads from local database
    - Fetches leads from connected CRM (HubSpot, etc.)
    - Merges and dedupes by email (local takes priority)
    - Flags duplicates with recommendations

    Source column values:
    - "local": Lead captured via Site2CRM
    - "hubspot": Lead from HubSpot only
    - Original source value if set (e.g., "axiondeep.com")
    """
    organization_id = current_user.organization_id
    if organization_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Get local leads
    local_leads: List[models.Lead] = lead_crud.get_leads(db, organization_id=organization_id)

    # Get organization's active CRM
    org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
    active_crm = org.active_crm if org else "hubspot"

    crm_leads: List[Dict[str, Any]] = []
    duplicates: List[Dict[str, str]] = []
    crm_error: Optional[str] = None

    # Fetch from CRM if enabled
    if include_crm and active_crm == "hubspot":
        try:
            crm_leads = await hubspot_fetch_all_contacts(
                organization_id=organization_id,
                max_contacts=1000,
            )
        except Exception as e:
            crm_error = f"Could not fetch from HubSpot: {str(e)}"
            logger.warning(crm_error)

    # Merge and dedupe
    if crm_leads:
        items, duplicates = _dedupe_leads(local_leads, crm_leads, active_crm)
    else:
        items = [_lead_to_dict(l, crm_source="local", is_crm_only=False) for l in local_leads]

    # Search filter
    if q:
        q_lower = q.lower()

        def _hit(item: Dict[str, Any]) -> bool:
            return any(
                (str(item.get(f) or "")).lower().find(q_lower) >= 0
                for f in ("email", "name", "first_name", "last_name", "phone", "company", "source", "notes")
            )

        items = [i for i in items if _hit(i)]

    # UTM source filter
    if utm_source:
        items = [i for i in items if (i.get("utm_source") or "").lower() == utm_source.lower()]

    # UTM medium filter
    if utm_medium:
        items = [i for i in items if (i.get("utm_medium") or "").lower() == utm_medium.lower()]

    # Sort
    reverse = dir.lower() == "desc"

    def _key(item: Dict[str, Any]):
        v = item.get(sort)
        return (v is None, v or "")

    try:
        items.sort(key=_key, reverse=reverse)
    except Exception:
        items.sort(
            key=lambda i: (i.get("created_at") is None, i.get("created_at") or ""),
            reverse=True,
        )

    # Paginate
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return {
        "items": page_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": end < total,
        "has_prev": page > 1,
        "sort": sort,
        "dir": dir,
        "q": q or "",
        "organization_id": organization_id,
        "crm_synced": active_crm if include_crm and crm_leads else None,
        "crm_error": crm_error,
        "duplicates": duplicates if duplicates else None,
    }


# ---- UTM filter options ----
@router.get("/leads/filters")
def get_lead_filters(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get unique UTM source and medium values for filter dropdowns."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Get unique utm_source values
    utm_sources = (
        db.query(models.Lead.utm_source)
        .filter(models.Lead.organization_id == org_id)
        .filter(models.Lead.utm_source.isnot(None))
        .distinct()
        .all()
    )

    # Get unique utm_medium values
    utm_mediums = (
        db.query(models.Lead.utm_medium)
        .filter(models.Lead.organization_id == org_id)
        .filter(models.Lead.utm_medium.isnot(None))
        .distinct()
        .all()
    )

    return {
        "utm_sources": sorted([s[0] for s in utm_sources if s[0]]),
        "utm_mediums": sorted([m[0] for m in utm_mediums if m[0]]),
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
