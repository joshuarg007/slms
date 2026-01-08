from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
import httpx

from app.db.session import SessionLocal
from app.db import models
from app.core.config import settings


NUTSHELL_API_URL = "https://api.nutshell.com/v1/json"


# ---------------------------------------------------------------------
# TOKEN LOADING
# ---------------------------------------------------------------------
def _get_org_token(organization_id: int) -> Optional[str]:
    db = SessionLocal()
    try:
        cred = (
            db.query(models.IntegrationCredential)
            .filter(
                models.IntegrationCredential.organization_id == organization_id,
                models.IntegrationCredential.provider == "nutshell",
                models.IntegrationCredential.is_active == True,
            )
            .order_by(models.IntegrationCredential.updated_at.desc())
            .first()
        )
        return cred.access_token if cred else None
    finally:
        db.close()


# ---------------------------------------------------------------------
# RAW REQUEST WRAPPER
# ---------------------------------------------------------------------
async def _nutshell_request(
    method: str,
    params: Dict[str, Any],
    token: Optional[str],
) -> Union[Dict[str, Any], str, None]:

    api_key = token or settings.nutshell_api_key

    if not api_key:
        return "unauthorized"

    payload = {
        "method": method,
        "params": params,
        "id": "1",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                NUTSHELL_API_URL,
                json=payload,
                auth=(api_key, ""),
            )

            if resp.status_code in (401, 403):
                return "unauthorized"

            if resp.status_code >= 400:
                return f"HTTP {resp.status_code}"

            data = resp.json()
            if "error" in data and data["error"]:
                return "error"

            return data.get("result")

        except Exception:
            return "connection_failed"


# ---------------------------------------------------------------------
# GET USERS (SALESPEOPLE)
# ---------------------------------------------------------------------
async def get_owners(
    organization_id: Optional[int] = None,
) -> Union[List[Dict[str, Any]], Dict[str, str]]:

    token = _get_org_token(organization_id) if organization_id else None

    result = await _nutshell_request(
        "findUsers",
        params={"filter": {}},
        token=token,
    )

    if result == "unauthorized":
        return {"warning": "Nutshell API key invalid or missing."}

    if isinstance(result, str):
        return {"warning": f"Nutshell request failed: {result}"}

    owners: List[Dict[str, Any]] = []

    for u in result or []:
        owners.append(
            {
                "id": str(u.get("id") or ""),
                "email": u.get("email", ""),
                "firstName": u.get("firstName", ""),
                "lastName": u.get("lastName", ""),
                "archived": False,
            }
        )

    return owners


# ---------------------------------------------------------------------
# DEAL COUNT SINCE DATE
# ---------------------------------------------------------------------
async def _count_deals_created_since(
    owner_id: str,
    since_ms: int,
    token: Optional[str],
) -> int:

    since_iso = datetime.fromtimestamp(since_ms / 1000, timezone.utc).isoformat()

    result = await _nutshell_request(
        "findLeads",
        params={
            "filter": {
                "owner": {"id": int(owner_id)} if owner_id else None,
                "completedTime": {"min": since_iso},
            },
            "orderBy": "createdTime",
        },
        token=token,
    )

    if result in ("unauthorized", "connection_failed"):
        return 0

    if isinstance(result, str):
        return 0

    leads = result or []
    return len(leads)


# ---------------------------------------------------------------------
# SALESPEOPLE STATS
# ---------------------------------------------------------------------
async def get_salespeople_stats(
    days: int = 7,
    owner_id: Optional[str] = None,
    include_archived_owners: bool = False,  # ignored for Nutshell
    organization_id: Optional[int] = None,
    **kwargs: Any,
) -> List[Dict[str, Any]]:

    token = _get_org_token(organization_id) if organization_id else None

    owners_resp = await get_owners(organization_id=organization_id)

    # Soft warning
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
            owner_id=oid,
            since_ms=since_ms,
            token=token,
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


# Alias for consistency with other CRM integrations
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


# ---------------------------------------------------------------------
# CREATE LEAD
# ---------------------------------------------------------------------
async def create_lead(
    description: str,
    contact_name: str,
    contact_email: str,
    organization_id: Optional[int] = None,
    **kwargs: Any,
) -> Optional[Dict[str, Any]]:
    """
    Create a new lead in Nutshell CRM.

    Nutshell requires creating a contact first, then linking to a lead.
    Uses JSON-RPC methods: newContact, newLead
    """
    token = _get_org_token(organization_id) if organization_id else None

    # Parse name into first/last
    name_parts = (contact_name or contact_email or "Unknown").strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    # Step 1: Create or find contact
    contact_result = await _nutshell_request(
        "newContact",
        params={
            "contact": {
                "name": {
                    "givenName": first_name,
                    "familyName": last_name,
                },
                "email": [contact_email] if contact_email else [],
            }
        },
        token=token,
    )

    if isinstance(contact_result, str):
        # Contact creation failed, try to create lead without contact
        contact_id = None
    else:
        contact_id = contact_result.get("id") if contact_result else None

    # Step 2: Create lead
    lead_params: Dict[str, Any] = {
        "lead": {
            "description": description or f"Lead from {contact_email}",
        }
    }

    # Link contact if we have one
    if contact_id:
        lead_params["lead"]["contacts"] = [{"id": contact_id}]

    lead_result = await _nutshell_request(
        "newLead",
        params=lead_params,
        token=token,
    )

    if isinstance(lead_result, str):
        return None

    return lead_result
