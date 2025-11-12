# app/integrations/pipedrive.py
import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

import httpx
from app.core.config import settings

BASE = (settings.pipedrive_base_url or "https://api.pipedrive.com").rstrip("/")
API_V1 = f"{BASE}/v1"
API_V2 = f"{BASE}/api/v2"


def _auth_params(extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    p = {"api_token": settings.pipedrive_api_token} if settings.pipedrive_api_token else {}
    if extra:
        p.update(extra)
    return p


def _cutoff_utc_iso(days: int) -> str:
    return (dt.datetime.utcnow() - dt.timedelta(days=days)).replace(microsecond=0).isoformat() + "Z"


async def list_users() -> List[Dict[str, Any]]:
    if not settings.pipedrive_api_token:
        return []
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{API_V1}/users", params=_auth_params())
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


async def count_new_deals(owner_id: str, days: int) -> int:
    if not settings.pipedrive_api_token:
        return 0
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
            qp = _auth_params(params | ({"cursor": cursor} if cursor else {}))
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


async def count_activities(owner_id: str, days: int) -> Tuple[int, int, int]:
    """returns (emails, calls, meetings) done in the last N days."""
    if not settings.pipedrive_api_token:
        return (0, 0, 0)
    cutoff = _cutoff_utc_iso(days)
    emails = calls = meetings = 0
    limit = 500
    cursor: Optional[str] = None

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            params = {
                "owner_id": owner_id,
                "done": "true",
                "updated_since": cutoff,  # operates on update_time; good enough for recent stats
                "limit": limit,
            }
            if cursor:
                params["cursor"] = cursor
            r = await client.get(f"{API_V2}/activities", params=_auth_params(params))
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

    return (emails, calls, meetings)


async def owners_stats(days: int, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    users = await list_users()
    if owner_id is None:
        selected = [u for u in users if u.get("active")]
    else:
        selected = [u for u in users if str(u.get("id")) == str(owner_id)]

    out: List[Dict[str, Any]] = []
    for u in selected:
        oid = str(u["id"])
        emails, calls, meetings = await count_activities(oid, days)
        new_deals = await count_new_deals(oid, days)
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
    title: str,
    name: str = "",
    email: str = "",
) -> Dict[str, Any]:
    """
    Create a simple Person, then a Lead linked to that person.
    Used when Site2CRM wants to push a new lead into Pipedrive.
    """
    if not settings.pipedrive_api_token:
        return {}

    async with httpx.AsyncClient(timeout=30) as client:
        person_id: Optional[int] = None
        person_name = name or email or "New Lead"

        # 1) Create person
        person_payload: Dict[str, Any] = {"name": person_name}
        if email:
            person_payload["email"] = email

        pr = await client.post(
            f"{API_V1}/persons",
            params=_auth_params(),
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
            params=_auth_params(),
            json=lead_payload,
        )
        lr.raise_for_status()
        return lr.json() or {}
