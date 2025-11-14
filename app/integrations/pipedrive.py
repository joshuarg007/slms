# app/integrations/pipedrive.py
import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.db.session import SessionLocal
from app.db import models


BASE = "https://api.pipedrive.com".rstrip("/")
API_V1 = f"{BASE}/v1"
API_V2 = f"{BASE}/api/v2"


def _get_org_token(organization_id: Optional[int]) -> str:
    """
    Look up the active Pipedrive IntegrationCredential for this organization.
    Raises RuntimeError if none is found.
    """
    if not organization_id:
        raise RuntimeError("Pipedrive organization id is required")

    db = SessionLocal()
    try:
        cred = (
            db.query(models.IntegrationCredential)
            .filter(
                models.IntegrationCredential.organization_id == organization_id,
                models.IntegrationCredential.provider == "pipedrive",
                models.IntegrationCredential.is_active == True,  # noqa: E712
            )
            .order_by(models.IntegrationCredential.updated_at.desc())
            .first()
        )
        if not cred or not cred.access_token:
            raise RuntimeError(
                "No Pipedrive API token configured for this organization"
            )
        return cred.access_token
    finally:
        db.close()


def _auth_params(
    organization_id: Optional[int],
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    token = _get_org_token(organization_id)
    params: Dict[str, Any] = {"api_token": token}
    if extra:
        params.update(extra)
    return params


def _cutoff_utc_iso(days: int) -> str:
    return (
        dt.datetime.utcnow() - dt.timedelta(days=days)
    ).replace(microsecond=0).isoformat() + "Z"


async def list_users(organization_id: int) -> List[Dict[str, Any]]:
    """
    List Pipedrive users for this organization.
    Uses the per organization IntegrationCredential.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{API_V1}/users",
            params=_auth_params(organization_id),
        )
        r.raise_for_status()
        data = r.json()
        users = data.get("data") or []
        return [
            {
                "id": str(u.get("id")),
                "name": u.get("name") or "",
                "email": (u.get("email") or "").lower(),
                "active": bool(u.get("active_flag", True)),
            }
            for u in users
            if u
        ]


async def count_new_deals(
    organization_id: int,
    owner_id: str,
    days: int,
) -> int:
    cutoff = _cutoff_utc_iso(days)
    total = 0
    cursor: Optional[str] = None
    params = {
        "owner_id": owner_id,
        "sort_by": "add_time",
        "sort_direction": "desc",
        "limit": 500,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            qp = _auth_params(
                organization_id,
                params | ({"cursor": cursor} if cursor else {}),
            )
            r = await client.get(f"{API_V2}/deals", params=qp)
            r.raise_for_status()
            payload = r.json() or {}
            rows = payload.get("data") or []
            if not rows:
                break

            for d in rows:
                add_time = d.get("add_time") or d.get("add_time_gmt") or ""
                if not add_time:
                    continue
                # add_time is RFC3339 in v2
                if add_time >= cutoff:
                    total += 1
                else:
                    # results are sorted desc; we can stop
                    return total

            cursor = (payload.get("additional_data") or {}).get("next_cursor")
            if not cursor:
                break

    return total


async def count_activities(
    organization_id: int,
    owner_id: str,
    days: int,
) -> Tuple[int, int, int]:
    """
    Returns emails, calls, meetings done in the last N days.
    """
    cutoff = _cutoff_utc_iso(days)
    emails = calls = meetings = 0
    limit = 500
    cursor: Optional[str] = None

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            params = {
                "owner_id": owner_id,
                "done": "true",
                "updated_since": cutoff,
                "limit": limit,
            }
            if cursor:
                params["cursor"] = cursor

            r = await client.get(
                f"{API_V2}/activities",
                params=_auth_params(organization_id, params),
            )
            r.raise_for_status()
            payload = r.json() or {}
            rows = payload.get("data") or []

            for a in rows:
                typ = (a.get("type") or "").lower()
                if typ == "call":
                    calls += 1
                elif typ == "meeting":
                    meetings += 1
                elif typ == "email":
                    emails += 1

            cursor = (payload.get("additional_data") or {}).get("next_cursor")
            if not cursor:
                break

    return emails, calls, meetings


async def owners_stats(
    days: int,
    owner_id: Optional[str] = None,
    organization_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Main entry point for salesperson stats from Pipedrive.

    Uses the active IntegrationCredential for this organization.
    """
    if not organization_id:
        raise RuntimeError(
            "Pipedrive organization id is required to fetch salesperson stats"
        )

    users = await list_users(organization_id)

    if owner_id is None:
        selected = [u for u in users if u.get("active")]
    else:
        selected = [u for u in users if str(u.get("id")) == str(owner_id)]

    out: List[Dict[str, Any]] = []

    for u in selected:
        oid = str(u["id"])
        emails, calls, meetings = await count_activities(
            organization_id,
            oid,
            days,
        )
        new_deals = await count_new_deals(
            organization_id,
            oid,
            days,
        )
        out.append(
            {
                "owner_id": oid,
                "owner_name": u.get("name") or "",
                "owner_email": u.get("email") or "",
                "emails_last_n_days": emails,
                "calls_last_n_days": calls,
                "meetings_last_n_days": meetings,
                "new_deals_last_n_days": new_deals,
            }
        )

    return out


async def create_lead(
    organization_id: int,
    title: str,
    name: str = "",
    email: str = "",
) -> Dict[str, Any]:
    """
    Create a simple Person, then a Lead linked to that person.
    Uses the per organization IntegrationCredential.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        person_name = name or email or "New Lead"

        # 1) Create person
        person_payload: Dict[str, Any] = {"name": person_name}
        if email:
            person_payload["email"] = email

        pr = await client.post(
            f"{API_V1}/persons",
            params=_auth_params(organization_id),
            json=person_payload,
        )
        pr.raise_for_status()
        pdata = pr.json() or {}
        person = pdata.get("data") or {}
        person_id = person.get("id")

        # 2) Create lead linked to person
        lead_payload: Dict[str, Any] = {
            "title": title or person_name,
        }
        if person_id:
            lead_payload["person_id"] = person_id

        lr = await client.post(
            f"{API_V1}/leads",
            params=_auth_params(organization_id),
            json=lead_payload,
        )
        lr.raise_for_status()
        return lr.json() or {}
