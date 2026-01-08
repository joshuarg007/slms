# app/integrations/zoho.py
"""
Zoho CRM integration for Site2CRM.

Handles:
- Lead creation (Leads module)
- Salespeople stats (Users, Deals modules)
- Contact management
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
import json
import logging

import httpx
from app.db.session import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)

DEFAULT_API_DOMAIN = "https://www.zohoapis.com"


def _get_org_credentials(organization_id: int) -> Optional[Dict[str, Any]]:
    """Get Zoho OAuth credentials for an organization."""
    db = SessionLocal()
    try:
        cred = (
            db.query(models.IntegrationCredential)
            .filter(
                models.IntegrationCredential.organization_id == organization_id,
                models.IntegrationCredential.provider == "zoho",
                models.IntegrationCredential.is_active == True,
            )
            .order_by(models.IntegrationCredential.updated_at.desc())
            .first()
        )
        if not cred:
            return None

        # Parse metadata for api_domain
        meta = {}
        if cred.scopes:
            try:
                meta = json.loads(cred.scopes)
            except Exception:
                pass

        return {
            "access_token": cred.access_token,
            "refresh_token": cred.refresh_token,
            "api_domain": meta.get("api_domain", DEFAULT_API_DOMAIN),
        }
    finally:
        db.close()


async def _request(
    method: str,
    endpoint: str,
    organization_id: int,
    params: Optional[Dict[str, Any]] = None,
    json_data: Optional[Dict[str, Any]] = None,
) -> Union[Dict[str, Any], str, None]:
    """Make authenticated request to Zoho CRM API."""

    creds = _get_org_credentials(organization_id)
    if not creds:
        logger.warning("Zoho request attempted without credentials for org %s", organization_id)
        return "unauthorized"

    access_token = creds["access_token"]
    api_domain = creds["api_domain"].rstrip("/")

    url = f"{api_domain}/crm/v6{endpoint}"

    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.request(
                method,
                url,
                params=params,
                json=json_data,
                headers=headers,
            )

            if resp.status_code in (401, 403):
                logger.warning("Zoho unauthorized for endpoint %s", endpoint)
                return "unauthorized"

            if resp.status_code >= 400:
                logger.error(
                    "Zoho error for endpoint %s status %s body %s",
                    endpoint,
                    resp.status_code,
                    resp.text[:200],
                )
                return f"HTTP {resp.status_code}"

            if resp.text.strip():
                return resp.json()
            return None

        except Exception as exc:
            logger.exception("Zoho connection failure for endpoint %s: %s", endpoint, exc)
            return "connection_failed"


async def get_owners(
    organization_id: Optional[int] = None,
) -> Union[List[Dict[str, Any]], Dict[str, str]]:
    """Get list of Zoho CRM users (salespeople)."""

    if not organization_id:
        return {"warning": "Organization ID required"}

    data = await _request("GET", "/users", organization_id, params={"type": "ActiveUsers"})

    if data == "unauthorized":
        return {"warning": "Zoho credentials invalid or missing."}

    if isinstance(data, str):
        return {"warning": f"Zoho request failed: {data}"}

    users = data.get("users") or []

    owners = []
    for u in users:
        owners.append({
            "id": str(u.get("id") or ""),
            "email": u.get("email", ""),
            "firstName": u.get("first_name", ""),
            "lastName": u.get("last_name", ""),
            "archived": u.get("status") != "active",
        })

    return owners


async def _count_deals_created_since(
    owner_id: str,
    since_date: str,  # ISO date string YYYY-MM-DD
    organization_id: int,
) -> int:
    """Count deals created by owner since date."""

    # Zoho uses COQL (CRM Object Query Language) for complex queries
    # But for simplicity, we'll use the search endpoint
    params = {
        "criteria": f"(Owner.id:equals:{owner_id})and(Created_Time:greater_equal:{since_date})",
        "fields": "id",
    }

    data = await _request("GET", "/Deals/search", organization_id, params=params)

    if isinstance(data, str) or data is None:
        return 0

    deals = data.get("data") or []
    return len(deals)


async def get_salespeople_stats(
    days: int = 7,
    owner_id: Optional[str] = None,
    include_archived_owners: bool = False,
    organization_id: Optional[int] = None,
    **kwargs: Any,
) -> List[Dict[str, Any]]:
    """Get salespeople activity stats from Zoho CRM."""

    if not organization_id:
        return [{"warning": "Organization ID required"}]

    owners_resp = await get_owners(organization_id=organization_id)

    if isinstance(owners_resp, dict) and "warning" in owners_resp:
        return [{
            "owner_id": "",
            "owner_name": "",
            "owner_email": "",
            "emails_last_n_days": 0,
            "calls_last_n_days": 0,
            "meetings_last_n_days": 0,
            "new_deals_last_n_days": 0,
            "warning": owners_resp["warning"],
        }]

    owners: List[Dict[str, Any]] = owners_resp

    if not include_archived_owners:
        owners = [o for o in owners if not o.get("archived")]

    if owner_id:
        owners = [o for o in owners if str(o.get("id")) == str(owner_id)]

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=max(0, int(days)))
    since_date = since.strftime("%Y-%m-%d")

    rows: List[Dict[str, Any]] = []

    for o in owners:
        oid = str(o.get("id") or "")
        name = " ".join(
            filter(None, [o.get("firstName"), o.get("lastName")])
        ).strip() or (o.get("email") or oid)

        new_deals = await _count_deals_created_since(
            owner_id=oid,
            since_date=since_date,
            organization_id=organization_id,
        )

        rows.append({
            "owner_id": oid,
            "owner_name": name,
            "owner_email": o.get("email"),
            "emails_last_n_days": 0,  # Would need Zoho Email integration
            "calls_last_n_days": 0,   # Would need Zoho Telephony integration
            "meetings_last_n_days": 0, # Would need Events API
            "new_deals_last_n_days": new_deals,
        })

    return rows


# Alias for consistency
async def owners_stats(
    days: int = 7,
    owner_id: Optional[str] = None,
    include_archived_owners: bool = False,
    organization_id: Optional[int] = None,
    **kwargs: Any,
) -> List[Dict[str, Any]]:
    return await get_salespeople_stats(
        days=days,
        owner_id=owner_id,
        include_archived_owners=include_archived_owners,
        organization_id=organization_id,
        **kwargs,
    )


async def create_lead(
    title: str,
    name: str,
    email: str,
    company: Optional[str] = None,
    phone: Optional[str] = None,
    organization_id: Optional[int] = None,
    **kwargs: Any,
) -> Optional[Dict[str, Any]]:
    """
    Create a new lead in Zoho CRM.

    Zoho requires Last_Name at minimum for Leads.
    """
    if not organization_id:
        logger.warning("create_lead called without organization_id")
        return None

    # Parse name into first/last
    name_parts = (name or email or "Unknown").strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else name_parts[0]

    lead_data = {
        "data": [{
            "Last_Name": last_name,
            "First_Name": first_name,
            "Email": email,
            "Company": company or title or "Unknown",
            "Lead_Source": "Site2CRM",
            "Description": title,
        }]
    }

    if phone:
        lead_data["data"][0]["Phone"] = phone

    result = await _request(
        "POST",
        "/Leads",
        organization_id,
        json_data=lead_data,
    )

    if isinstance(result, str) or result is None:
        logger.error("Failed to create Zoho lead: %s", result)
        return None

    # Return the created lead data
    created = result.get("data", [])
    if created:
        return created[0].get("details", created[0])

    return result
