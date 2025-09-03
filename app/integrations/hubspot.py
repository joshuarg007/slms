# app/integrations/hubspot.py
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from app.core.config import settings

HUBSPOT_BASE_URL = "https://api.hubapi.com"


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.hubspot_api_key}",
        "Content-Type": "application/json",
    }


async def create_contact(
    email: str,
    first_name: str = "",
    last_name: str = "",
    phone: str = "",
):
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
        r = await client.post(url, json=payload, headers=_headers())
        r.raise_for_status()
        return r.json()


async def get_owners(
    include_archived: bool = False,
    limit: int = 100,
    organization_id: Optional[int] = None,  # accepted for multi-tenant callers; ignored here
    **kwargs: Any,  # absorb future args safely
) -> List[Dict[str, Any]]:
    url = f"{HUBSPOT_BASE_URL}/crm/v3/owners/"
    params = {
        "limit": str(limit),
        "archived": "true" if include_archived else "false",
    }

    owners: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            resp = await client.get(url, headers=_headers(), params=params)
            resp.raise_for_status()
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

            paging = data.get("paging", {})
            after = paging.get("next", {}).get("after")  # <-- fixed stray dot
            if after:
                params["after"] = after
            else:
                break

    return owners


async def _count_deals_created_since(owner_id: str, since_ms: int) -> int:
    # handles hubspot_owner_id and hs_owner_id
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
        "properties": ["dealname", "createdate", "hubspot_owner_id", "hs_owner_id"],
        "limit": 1,  # we only need the total
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(url, headers=_headers(), json=body)
        # if the token lacks deal read scope, return 0 rather than explode
        if r.status_code >= 400:
            return 0
        data = r.json()
        return int(data.get("total", len(data.get("results", []))))


async def get_salespeople_stats(
    days: int = 7,
    owner_id: Optional[str] = None,
    include_archived_owners: bool = False,
    **kwargs: Any,
) -> List[Dict[str, Any]]:
    owners = await get_owners(include_archived=include_archived_owners)
    if owner_id:
        owners = [o for o in owners if str(o.get("id")) == str(owner_id)]

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=max(0, int(days)))
    since_ms = int(since.timestamp() * 1000)

    rows: List[Dict[str, Any]] = []
    for o in owners:
        oid = str(o.get("id") or "")
        name = " ".join(filter(None, [o.get("firstName"), o.get("lastName")])).strip() or (o.get("email") or oid)

        new_deals = await _count_deals_created_since(oid, since_ms)

        rows.append(
            {
                "owner_id": oid,
                "owner_name": name,
                "owner_email": o.get("email"),
                "emails_last_n_days": 0,   # left at 0 for now (scopes vary)
                "calls_last_n_days": 0,    # left at 0 for now
                "meetings_last_n_days": 0, # left at 0 for now
                "new_deals_last_n_days": new_deals,
            }
        )
    return rows
