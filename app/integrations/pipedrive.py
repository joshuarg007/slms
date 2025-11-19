from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

import logging
import httpx
from app.db.session import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)

PIPEDRIVE_BASE_URL = "https://api.pipedrive.com/v1"


# ---------------------------------------------------------------------
# TOKEN LOADING
# ---------------------------------------------------------------------
def _get_org_token(organization_id: int) -> Optional[str]:
    """
    Fetch the latest active IntegrationCredential for Pipedrive
    for the given organization.
    """
    db = SessionLocal()
    try:
        cred = (
            db.query(models.IntegrationCredential)
            .filter(
                models.IntegrationCredential.organization_id == organization_id,
                models.IntegrationCredential.provider == "pipedrive",
                models.IntegrationCredential.is_active == True,
            )
            .order_by(models.IntegrationCredential.updated_at.desc())
            .first()
        )
        return cred.access_token if cred else None
    finally:
        db.close()


# ---------------------------------------------------------------------
# REQUEST WRAPPER
# ---------------------------------------------------------------------
async def _request(
    method: str,
    url: str,
    token: Optional[str],
    **kwargs: Any,
) -> Union[Dict[str, Any], str, None]:
    """
    A standardized Pipedrive request wrapper.
    Uses ONLY per-organization credentials.
    Returns:
      - dict (successful JSON)
      - "unauthorized" (no token or invalid token)
      - "HTTP <code>" for other HTTP errors
      - "connection_failed" for network issues
    """
    if not token:
        logger.warning("Pipedrive request attempted without token for url %s", url)
        return "unauthorized"

    params = kwargs.pop("params", {}) or {}
    params["api_token"] = token

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.request(
                method,
                url,
                params=params,
                **kwargs,
            )

            if resp.status_code in (401, 403):
                logger.warning(
                    "Pipedrive unauthorized for url %s status %s",
                    url,
                    resp.status_code,
                )
                return "unauthorized"

            if resp.status_code >= 400:
                logger.error(
                    "Pipedrive error for url %s status %s body %s",
                    url,
                    resp.status_code,
                    resp.text,
                )
                return f"HTTP {resp.status_code}"

            if resp.text.strip():
                return resp.json()

            return None

        except Exception as exc:
            logger.exception("Pipedrive connection failure for url %s: %s", url, exc)
            return "connection_failed"


# ---------------------------------------------------------------------
# OWNERS (USERS)
# ---------------------------------------------------------------------
async def get_owners(
    organization_id: Optional[int] = None,
) -> Union[List[Dict[str, Any]], Dict[str, str]]:

    token = _get_org_token(organization_id) if organization_id else None
    url = f"{PIPEDRIVE_BASE_URL}/users"

    data = await _request("GET", url, token)

    if data == "unauthorized":
        return {"warning": "Pipedrive token missing or invalid."}

    if isinstance(data, str):
        return {"warning": f"Pipedrive request failed: {data}"}

    items = data.get("data") or []

    owners = []
    for u in items:
        owners.append(
            {
                "id": str(u.get("id") or ""),
                "email": u.get("email"),
                "firstName": u.get("name"),
                "lastName": "",
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

    url = f"{PIPEDRIVE_BASE_URL}/deals"

    params = {
        "user_id": owner_id,
        "filter_id": None,
        "since": since_iso,
    }

    data = await _request("GET", url, token, params=params)

    if data == "unauthorized":
        return 0

    if isinstance(data, str):
        return 0

    deals = data.get("data") or []
    return len(deals)


# ---------------------------------------------------------------------
# SALESPEOPLE STATS
# ---------------------------------------------------------------------
async def get_salespeople_stats(
    days: int = 7,
    owner_id: Optional[str] = None,
    include_archived_owners: bool = False,
    organization_id: Optional[int] = None,
    **kwargs: Any,
) -> List[Dict[str, Any]]:

    token = _get_org_token(organization_id) if organization_id else None

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

    if owner_id:
        owners = [o for o in owners if str(o.get("id")) == str(owner_id)]

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=max(0, int(days)))
    since_ms = int(since.timestamp() * 1000)

    rows: List[Dict[str, Any]] = []

    for o in owners:
        oid = str(o.get("id") or "")
        name = o.get("firstName") or o.get("email") or oid

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


# ---------------------------------------------------------------------
# LEAD CREATION (USED BY /public/leads)
# ---------------------------------------------------------------------
async def create_lead(
    title: str,
    name: str,
    email: str,
    organization_id: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Create a person and then a lead in Pipedrive.
    Only uses per-organization IntegrationCredential.
    """
    token = _get_org_token(organization_id) if organization_id else None

    # PERSON
    person_url = f"{PIPEDRIVE_BASE_URL}/persons"
    person_payload = {
        "name": name or email,
        "email": [
            {
                "value": email,
                "primary": True,
                "label": "work",
            }
        ],
    }

    person_data = await _request(
        "POST",
        person_url,
        token,
        json=person_payload,
    )

    if isinstance(person_data, str) or person_data is None:
        return None

    person = person_data.get("data") or {}
    person_id = person.get("id")
    if not person_id:
        return None

    # LEAD
    lead_url = f"{PIPEDRIVE_BASE_URL}/leads"
    lead_payload = {
        "title": title,
        "person_id": person_id,
    }

    lead_data = await _request(
        "POST",
        lead_url,
        token,
        json=lead_payload,
    )

    if isinstance(lead_data, str) or lead_data is None:
        return None

    return lead_data.get("data") or None
