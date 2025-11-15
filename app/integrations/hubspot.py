# app/integrations/hubspot.py
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

import httpx
from app.core.config import settings
from app.db.session import SessionLocal
from app.db import models

HUBSPOT_BASE_URL = "https://api.hubapi.com"


# ---------------------------------------------------------------
# PER ORG TOKEN LOOKUP
# ---------------------------------------------------------------
def _get_org_token(organization_id: int) -> Optional[str]:
    """
    Return the active HubSpot IntegrationCredential for this org.
    """
    db = SessionLocal()
    try:
        cred = (
            db.query(models.IntegrationCredential)
            .filter(
                models.IntegrationCredential.organization_id == organization_id,
                models.IntegrationCredential.provider == "hubspot",
                models.IntegrationCredential.is_active.is_(True),
            )
            .order_by(models.IntegrationCredential.updated_at.desc())
            .first()
        )
        return cred.access_token if cred else None
    finally:
        db.close()


# ---------------------------------------------------------------
# HEADERS
# ---------------------------------------------------------------
def _headers(token_override: Optional[str] = None) -> Dict[str, str]:
    """
    Returns API headers using an override token if provided, else settings.hubspot_api_key.
    """
    token = token_override or settings.hubspot_api_key
    if not token:
        raise RuntimeError("HubSpot Pro required: no valid token found.")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------
# CONTACT CREATION (USED BY main.py)
# ---------------------------------------------------------------
async def create_contact(
    email: str,
    first_name: str = "",
    last_name: str = "",
    phone: str = "",
    organization_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Create a contact in HubSpot.

    If organization_id is provided, first try that org's IntegrationCredential
    (provider="hubspot"); if missing, fall back to settings.hubspot_api_key.
    """
    token: Optional[str] = None
    if organization_id is not None:
        token = _get_org_token(organization_id)

    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts"
    payload = {
        "properties": {
            "email": email,
            "firstname": first_name,
            "lastname": last_name,
            "phone": phone,
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload, headers=_headers(token))
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------
# GET OWNERS (SOFT-WARNING LOGIC)
# ---------------------------------------------------------------
async def get_owners(
    include_archived: bool = False,
    limit: int = 100,
    organization_id: Optional[int] = None,
) -> Union[List[Dict[str, Any]], Dict[str, str]]:
    """
    Returns owners or a soft-warning dict if the token lacks scopes.
    """
    token = None
    if organization_id is not None:
        token = _get_org_token(organization_id)

    url = f"{HUBSPOT_BASE_URL}/crm/v3/owners/"
    params = {
        "limit": str(limit),
        "archived": "true" if include_archived else "false",
    }

    owners: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(url, headers=_headers(token), params=params)
        except Exception:
            return {"warning": "HubSpot Pro required: could not reach owners API."}

        if resp.status_code == 401:
            return {"warning": "HubSpot Pro required for salesperson analytics."}

        if resp.status_code >= 400:
            return {"warning": f"HubSpot owners API error ({resp.status_code})."}

        data = resp.json()
        for o in data.get("results", []):
            owners.append(
                {
                    "id": str(o.get("id") or o.get("userId") or ""),
                    "email": o.get("email"),
                    "firstName": o.get("firstName") or o.get("firstname"),
                    "lastName": o.get("lastName") or o.get("lastname"),
                    "archived": bool(o.get("archived")),
                }
            )

    return owners


# ---------------------------------------------------------------
# COUNT DEALS CREATED SINCE
# ---------------------------------------------------------------
async def _count_deals_created_since(
    owner_id: str,
    since_ms: int,
    token_override: Optional[str] = None,
) -> int:
    """
    Returns integer count OR 0 on any permission issue.
    """
    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/deals/search"

    body = {
        "filterGroups": [
            {
                "filters": [
                    {"propertyName": "createdate", "operator": "GTE", "value": str(since_ms)},
                    {"propertyName": "hubspot_owner_id", "operator": "EQ", "value": owner_id},
                ]
            },
            {
                "filters": [
                    {"propertyName": "createdate", "operator": "GTE", "value": str(since_ms)},
                    {"propertyName": "hs_owner_id", "operator": "EQ", "value": owner_id},
                ]
            },
        ],
        "properties": ["dealname", "createdate"],
        "limit": 1,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(url, headers=_headers(token_override), json=body)
        except Exception:
            return 0

        if r.status_code in (401, 403):
            return 0

        if r.status_code >= 400:
            return 0

        data = r.json()
        return int(data.get("total", len(data.get("results", []))))


# ---------------------------------------------------------------
# GET SALESPEOPLE STATS
# ---------------------------------------------------------------
async def get_salespeople_stats(
    days: int = 7,
    owner_id: Optional[str] = None,
    include_archived_owners: bool = False,
    organization_id: Optional[int] = None,
    **kwargs: Any,
) -> List[Dict[str, Any]]:
    """
    High-level HubSpot salesperson analytics with soft-warning behavior.
    """
    token = _get_org_token(organization_id) if organization_id else None

    owners_resp = await get_owners(
        include_archived=include_archived_owners,
        organization_id=organization_id,
    )

    # Soft-warning case
    if isinstance(owners_resp, dict) and "warning" in owners_resp:
        return [
            {
                "owner_id": "",
                "owner_name": "",
                "owner_email": "",
                "emails_last_n_days": 0,
                "calls_last_n_days": 0,
                "meetings_last_n_days": 0,
                "new_deals_last_n_days": 0,
                "warning": owners_resp["warning"],
            }
        ]

    owners = owners_resp

    if owner_id:
        owners = [o for o in owners if str(o.get("id")) == str(owner_id)]

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=max(0, int(days)))
    since_ms = int(since.timestamp() * 1000)

    rows: List[Dict[str, Any]] = []

    for o in owners:
        oid = str(o.get("id") or "")
        name = " ".join(
            filter(None, [o.get("firstName"), o.get("lastName")])
        ).strip() or (o.get("email") or oid)

        new_deals = await _count_deals_created_since(
            oid,
            since_ms,
            token_override=token,
        )

        rows.append(
            {
                "owner_id": oid,
                "owner_name": name,
                "owner_email": o.get("email"),
                "emails_last_n_days": 0,
                "calls_last_n_days": 0,
                "meetings_last_n_days": 0,
                "new_deals_last_n_days": new_deals,
            }
        )

    return rows
