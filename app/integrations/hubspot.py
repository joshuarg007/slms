import time
from typing import Dict, List, Optional

import httpx
from app.core.config import settings

HUBSPOT_BASE_URL = "https://api.hubapi.com"


# contacts (kept simple; just set core fields)
async def create_contact(
    email: str,
    first_name: str = "",
    last_name: str = "",
    phone: str = "",
    company: str = "",
):
    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts"
    headers = {
        "Authorization": f"Bearer {settings.hubspot_api_key}",
        "Content-Type": "application/json",
    }
    props = {
        "email": email,
        "firstname": first_name,
        "lastname": last_name,
        "phone": phone,
    }
    if company:
        props["company"] = company  # plain text company name

    payload = {"properties": props}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()


# quick lookup/update helpers so public leads can upsert
async def search_contact_by_email(email: str):
    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search"
    headers = {
        "Authorization": f"Bearer {settings.hubspot_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "filterGroups": [{"filters": [{"propertyName": "email", "operator": "EQ", "value": email}]}],
        "properties": ["email", "firstname", "lastname", "phone", "company"],
        "limit": 1,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=body)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        return results[0] if results else None


async def update_contact(contact_id: str, properties: Dict[str, str]):
    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts/{contact_id}"
    headers = {
        "Authorization": f"Bearer {settings.hubspot_api_key}",
        "Content-Type": "application/json",
    }
    payload = {"properties": properties}
    async with httpx.AsyncClient() as client:
        resp = await client.patch(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


# shared auth for the rest
def _auth_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.hubspot_api_key}",
        "Content-Type": "application/json",
    }


# owners
async def get_owners(include_archived: bool = False) -> List[Dict]:
    url = f"{HUBSPOT_BASE_URL}/crm/v3/owners/"
    params = {"archived": str(include_archived).lower()}
    headers = _auth_headers()
    results: List[Dict] = []
    after: Optional[str] = None

    async with httpx.AsyncClient() as client:
        while True:
            query = dict(params)
            if after:
                query["after"] = after
            resp = await client.get(url, headers=headers, params=query)
            resp.raise_for_status()
            data = resp.json()
            results.extend(data.get("results", []))
            paging = data.get("paging", {})
            next_link = paging.get("next", {})
            after = next_link.get("after")
            if not after:
                break

    return results


# generic CRM search (v3)
async def search_objects(
    object_name: str,
    filter_groups: List[Dict],
    properties: Optional[List[str]] = None,
    sorts: Optional[List[Dict]] = None,
    limit: int = 100,
) -> List[Dict]:
    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/{object_name}/search"
    headers = _auth_headers()
    results: List[Dict] = []
    after: Optional[str] = None

    async with httpx.AsyncClient() as client:
        while True:
            body: Dict = {"filterGroups": filter_groups, "limit": limit}
            if properties:
                body["properties"] = properties
            if sorts:
                body["sorts"] = sorts
            if after:
                body["after"] = after

            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

            results.extend(data.get("results", []))
            paging = data.get("paging", {})
            next_link = paging.get("next", {})
            after = next_link.get("after")
            if not after:
                break

    return results


# engagements (emails/calls/meetings) — not all portals expose these; fine to return 0
async def count_engagements_for_owner_since(object_name: str, owner_id: str, since_ms: int) -> int:
    filters = [
        {
            "filters": [
                {"propertyName": "hubspot_owner_id", "operator": "EQ", "value": str(owner_id)},
                {"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)},
            ]
        }
    ]
    items = await search_objects(object_name, filters, properties=["hs_object_id"])
    return len(items)


# deals — cover both owner/date property variants
async def count_deals_created_since(owner_id: str, since_ms: int) -> int:
    # search by date only; filter owner here (handles fresh-index quirks)
    filter_groups = [
        {"filters": [{"propertyName": "createdate", "operator": "GTE", "value": str(since_ms)}]},
        {"filters": [{"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)}]},
    ]
    props = ["id", "dealname", "hubspot_owner_id", "hs_owner_id", "createdate", "hs_createdate"]
    rows = await search_objects("deals", filter_groups, properties=props, limit=100)

    cnt = 0
    for r in rows:
        p = r.get("properties") or {}
        oid = p.get("hubspot_owner_id") or p.get("hs_owner_id")
        if str(oid) == str(owner_id):
            # created recently and assigned to the owner
            cnt += 1
    return cnt


# appointments (my “meetings” proxy when available)
async def count_appointments_for_owner_since(owner_id: str, since_ms: int) -> int:
    filters = [
        {
            "filters": [
                {"propertyName": "hubspot_owner_id", "operator": "EQ", "value": str(owner_id)},
                {"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)},
            ]
        },
        {
            "filters": [
                {"propertyName": "hs_owner_id", "operator": "EQ", "value": str(owner_id)},
                {"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)},
            ]
        },
    ]
    items = await search_objects("appointments", filters, properties=["hs_object_id"])
    return len(items)


# roll-up per owner, with quiet fallbacks
async def get_salespeople_stats(days: int = 7) -> List[Dict]:
    since_ms = int((time.time() - days * 86400) * 1000)
    owners = await get_owners(include_archived=False)

    results: List[Dict] = []
    for o in owners:
        owner_id = str(o.get("id") or o.get("ownerId") or "")
        if not owner_id:
            continue

        user = o.get("user") or {}
        owner_email = user.get("email") or o.get("email") or ""
        first = user.get("firstName") or o.get("firstName") or ""
        last = user.get("lastName") or o.get("lastName") or ""
        owner_name = (f"{first} {last}").strip() or owner_email or owner_id

        emails = calls = meetings = deals = 0

        # these may not exist in this portal; no noise if they fail
        try:
            emails = await count_engagements_for_owner_since("emails", owner_id, since_ms)
        except Exception:
            emails = 0
        try:
            calls = await count_engagements_for_owner_since("calls", owner_id, since_ms)
        except Exception:
            calls = 0

        # prefer appointments; fallback to meetings engagement if present
        try:
            meetings = await count_appointments_for_owner_since(owner_id, since_ms)
        except Exception:
            try:
                meetings = await count_engagements_for_owner_since("meetings", owner_id, since_ms)
            except Exception:
                meetings = 0

        try:
            deals = await count_deals_created_since(owner_id, since_ms)
        except Exception:
            deals = 0

        results.append(
            {
                "owner_id": owner_id,
                "owner_name": owner_name,
                "owner_email": owner_email or None,
                "emails_last_n_days": emails,
                "calls_last_n_days": calls,
                "meetings_last_n_days": meetings,
                "new_deals_last_n_days": deals,
            }
        )

    return results
