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
# COMPANY CREATION
# ---------------------------------------------------------------
async def create_company(
    name: str,
    domain: str = "",
    organization_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Create a company in HubSpot.

    Args:
        name: Company name (required)
        domain: Company website domain (optional, used for deduplication)
        organization_id: Org ID for token lookup

    Returns:
        HubSpot company object with 'id' field
    """
    token: Optional[str] = None
    if organization_id is not None:
        token = _get_org_token(organization_id)

    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/companies"
    properties = {"name": name}
    if domain:
        properties["domain"] = domain

    payload = {"properties": properties}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload, headers=_headers(token))
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------
# SEARCH COMPANY BY NAME (for deduplication)
# ---------------------------------------------------------------
async def search_company_by_name(
    name: str,
    organization_id: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Search for an existing company by name.

    Returns the first matching company or None if not found.
    """
    token: Optional[str] = None
    if organization_id is not None:
        token = _get_org_token(organization_id)

    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/companies/search"
    payload = {
        "filterGroups": [
            {
                "filters": [
                    {
                        "propertyName": "name",
                        "operator": "EQ",
                        "value": name,
                    }
                ]
            }
        ],
        "properties": ["name", "domain"],
        "limit": 1,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload, headers=_headers(token))
        if resp.status_code >= 400:
            return None
        data = resp.json()
        results = data.get("results", [])
        return results[0] if results else None


# ---------------------------------------------------------------
# ASSOCIATE CONTACT TO COMPANY
# ---------------------------------------------------------------
async def associate_contact_to_company(
    contact_id: str,
    company_id: str,
    organization_id: Optional[int] = None,
) -> bool:
    """
    Associate a contact with a company in HubSpot.

    Uses the v4 associations API with the standard "contact_to_company" type.

    Returns:
        True if successful, False otherwise
    """
    token: Optional[str] = None
    if organization_id is not None:
        token = _get_org_token(organization_id)

    url = f"{HUBSPOT_BASE_URL}/crm/v4/objects/contacts/{contact_id}/associations/companies/{company_id}"

    # Association type for contact -> company (primary)
    payload = [
        {
            "associationCategory": "HUBSPOT_DEFINED",
            "associationTypeId": 1,  # Contact to Company (primary)
        }
    ]

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.put(url, json=payload, headers=_headers(token))
        return resp.status_code < 400


# ---------------------------------------------------------------
# FULL LEAD CREATION (Contact + Company + Association)
# ---------------------------------------------------------------
async def create_lead_full(
    email: str,
    first_name: str = "",
    last_name: str = "",
    phone: str = "",
    company_name: str = "",
    organization_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Create a complete lead in HubSpot with proper entity relationships.

    Flow:
    1. Create the contact (person)
    2. If company_name provided: find or create the company
    3. Associate the contact with the company

    Args:
        email: Contact email (required)
        first_name: Contact first name
        last_name: Contact last name
        phone: Contact phone
        company_name: Company name (if provided, will create/find and associate)
        organization_id: Org ID for token lookup

    Returns:
        Dict with 'contact', 'company' (if created), and 'associated' status
    """
    result: Dict[str, Any] = {
        "contact": None,
        "company": None,
        "associated": False,
    }

    # Step 1: Create the contact
    contact = await create_contact(
        email=email,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        organization_id=organization_id,
    )
    result["contact"] = contact
    contact_id = contact.get("id")

    if not contact_id:
        return result

    # Step 2: If company name provided, find or create company
    if company_name and company_name.strip():
        company_name = company_name.strip()

        # Try to find existing company first
        existing_company = await search_company_by_name(
            name=company_name,
            organization_id=organization_id,
        )

        if existing_company:
            company = existing_company
        else:
            # Create new company
            company = await create_company(
                name=company_name,
                organization_id=organization_id,
            )

        result["company"] = company
        company_id = company.get("id")

        # Step 3: Associate contact with company
        if company_id:
            associated = await associate_contact_to_company(
                contact_id=contact_id,
                company_id=company_id,
                organization_id=organization_id,
            )
            result["associated"] = associated

    return result


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
