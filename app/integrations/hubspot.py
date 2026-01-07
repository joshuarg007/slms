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
def _headers(token_override: Optional[str] = None, allow_global_fallback: bool = False) -> Dict[str, str]:
    """
    Returns API headers using an override token if provided.

    Args:
        token_override: Explicit token to use
        allow_global_fallback: If True, falls back to global settings.hubspot_api_key
                               (used for marketing contact forms without org context)
    """
    token = token_override
    if not token and allow_global_fallback:
        token = settings.hubspot_api_key
    if not token:
        raise RuntimeError("No HubSpot integration configured for this organization.")
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
# MARKETING CONTACT FORM (uses global API key)
# ---------------------------------------------------------------
async def create_marketing_contact(
    email: str,
    first_name: str = "",
    last_name: str = "",
    company_name: str = "",
    source: str = "",
) -> Dict[str, Any]:
    """
    Create a full lead in HubSpot using the global API key.

    Creates: Contact + Company + Deal, all associated together.
    Used for marketing site contact forms where there's no organization context.

    Args:
        email: Contact email (required)
        first_name: Contact first name
        last_name: Contact last name
        company_name: Company name (defaults to "Site2CRM Lead" if empty)
        source: Lead source (e.g., "site2crm.io/contact")

    Returns:
        Dict with contact, company, deal info or error
    """
    if not settings.hubspot_api_key:
        return {"error": "HubSpot not configured"}

    headers = _headers(allow_global_fallback=True)
    result: Dict[str, Any] = {
        "contact": None,
        "company": None,
        "deal": None,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Create Contact
        contact_props = {
            "email": email,
            "firstname": first_name,
            "lastname": last_name,
            "hs_lead_status": "NEW",
        }
        actual_company = company_name.strip() if company_name else "Site2CRM Lead"
        contact_props["company"] = actual_company

        try:
            resp = await client.post(
                f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts",
                json={"properties": contact_props},
                headers=headers,
            )
            if resp.status_code == 409:
                # Contact exists, try to get their ID
                search_resp = await client.post(
                    f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search",
                    json={"filterGroups": [{"filters": [{"propertyName": "email", "operator": "EQ", "value": email}]}], "limit": 1},
                    headers=headers,
                )
                if search_resp.status_code == 200:
                    results = search_resp.json().get("results", [])
                    if results:
                        result["contact"] = results[0]
            else:
                resp.raise_for_status()
                result["contact"] = resp.json()
        except Exception as e:
            return {"error": f"Contact creation failed: {e}"}

        contact_id = result["contact"].get("id") if result["contact"] else None
        if not contact_id:
            return {"error": "Failed to get contact ID"}

        # 2. Create Company
        try:
            resp = await client.post(
                f"{HUBSPOT_BASE_URL}/crm/v3/objects/companies",
                json={"properties": {"name": actual_company}},
                headers=headers,
            )
            if resp.status_code == 409:
                # Company exists, search for it
                search_resp = await client.post(
                    f"{HUBSPOT_BASE_URL}/crm/v3/objects/companies/search",
                    json={"filterGroups": [{"filters": [{"propertyName": "name", "operator": "EQ", "value": actual_company}]}], "limit": 1},
                    headers=headers,
                )
                if search_resp.status_code == 200:
                    results = search_resp.json().get("results", [])
                    if results:
                        result["company"] = results[0]
            else:
                resp.raise_for_status()
                result["company"] = resp.json()
        except Exception as e:
            # Company creation failed but continue - not critical
            pass

        company_id = result["company"].get("id") if result["company"] else None

        # 3. Associate Contact with Company
        if company_id:
            try:
                await client.put(
                    f"{HUBSPOT_BASE_URL}/crm/v4/objects/contacts/{contact_id}/associations/companies/{company_id}",
                    json=[{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 1}],
                    headers=headers,
                )
            except Exception:
                pass  # Association failed but continue

        # 4. Create Deal
        contact_name = f"{first_name} {last_name}".strip() or email
        deal_name = f"Lead: {contact_name}" + (f" ({actual_company})" if actual_company != "Site2CRM Lead" else "")
        try:
            resp = await client.post(
                f"{HUBSPOT_BASE_URL}/crm/v3/objects/deals",
                json={"properties": {
                    "dealname": deal_name,
                    "pipeline": "default",
                    "dealstage": "appointmentscheduled",  # First stage
                    "description": f"Lead from {source}" if source else "Lead from Site2CRM contact form",
                }},
                headers=headers,
            )
            resp.raise_for_status()
            result["deal"] = resp.json()
        except Exception as e:
            # Deal creation failed
            result["deal_error"] = str(e)

        deal_id = result["deal"].get("id") if result["deal"] else None

        # 5. Associate Deal with Contact and Company
        if deal_id:
            try:
                # Deal -> Contact association
                await client.put(
                    f"{HUBSPOT_BASE_URL}/crm/v4/objects/deals/{deal_id}/associations/contacts/{contact_id}",
                    json=[{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 3}],
                    headers=headers,
                )
            except Exception:
                pass

            if company_id:
                try:
                    # Deal -> Company association
                    await client.put(
                        f"{HUBSPOT_BASE_URL}/crm/v4/objects/deals/{deal_id}/associations/companies/{company_id}",
                        json=[{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 5}],
                        headers=headers,
                    )
                except Exception:
                    pass

        return result


# ---------------------------------------------------------------
# FETCH ALL CONTACTS (for lead sync)
# ---------------------------------------------------------------
async def fetch_contacts(
    organization_id: Optional[int] = None,
    limit: int = 100,
    after: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch contacts from HubSpot with pagination.

    Args:
        organization_id: Org ID for token lookup
        limit: Number of contacts per page (max 100)
        after: Pagination cursor for next page

    Returns:
        Dict with 'contacts' list and 'paging' info (next cursor if more results)
    """
    token: Optional[str] = None
    if organization_id is not None:
        token = _get_org_token(organization_id)

    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts"
    params = {
        "limit": str(min(limit, 100)),
        "properties": "email,firstname,lastname,phone,company,createdate,lastmodifieddate,hs_lead_status",
    }
    if after:
        params["after"] = after

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(url, headers=_headers(token), params=params)
        except Exception as e:
            return {"contacts": [], "error": str(e)}

        if resp.status_code == 401:
            return {"contacts": [], "error": "HubSpot authentication failed"}

        if resp.status_code >= 400:
            return {"contacts": [], "error": f"HubSpot API error ({resp.status_code})"}

        data = resp.json()
        contacts = []

        for c in data.get("results", []):
            props = c.get("properties", {})
            contacts.append({
                "hubspot_id": c.get("id"),
                "email": props.get("email", ""),
                "first_name": props.get("firstname", ""),
                "last_name": props.get("lastname", ""),
                "phone": props.get("phone", ""),
                "company": props.get("company", ""),
                "created_at": props.get("createdate"),
                "updated_at": props.get("lastmodifieddate"),
                "status": props.get("hs_lead_status", ""),
            })

        # Get pagination cursor
        paging = data.get("paging", {})
        next_cursor = paging.get("next", {}).get("after")

        return {
            "contacts": contacts,
            "next_cursor": next_cursor,
            "has_more": next_cursor is not None,
        }


async def fetch_all_contacts(
    organization_id: Optional[int] = None,
    max_contacts: int = 1000,
) -> List[Dict[str, Any]]:
    """
    Fetch all contacts from HubSpot (up to max_contacts).

    Handles pagination automatically.

    Args:
        organization_id: Org ID for token lookup
        max_contacts: Maximum contacts to fetch (default 1000)

    Returns:
        List of contact dicts
    """
    all_contacts: List[Dict[str, Any]] = []
    cursor: Optional[str] = None

    while len(all_contacts) < max_contacts:
        result = await fetch_contacts(
            organization_id=organization_id,
            limit=100,
            after=cursor,
        )

        if "error" in result:
            break

        contacts = result.get("contacts", [])
        all_contacts.extend(contacts)

        if not result.get("has_more"):
            break

        cursor = result.get("next_cursor")

    return all_contacts[:max_contacts]


# ---------------------------------------------------------------
# SEARCH CONTACT BY EMAIL (for deduplication check)
# ---------------------------------------------------------------
async def search_contact_by_email(
    email: str,
    organization_id: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Search for an existing contact by email.

    Returns the matching contact or None if not found.
    """
    token: Optional[str] = None
    if organization_id is not None:
        token = _get_org_token(organization_id)

    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search"
    payload = {
        "filterGroups": [
            {
                "filters": [
                    {
                        "propertyName": "email",
                        "operator": "EQ",
                        "value": email,
                    }
                ]
            }
        ],
        "properties": ["email", "firstname", "lastname", "phone", "company"],
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
