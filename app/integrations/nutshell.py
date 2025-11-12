# app/integrations/nutshell.py
import base64
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from app.core.config import settings

# JSON-RPC endpoint (classic Nutshell API) :contentReference[oaicite:0]{index=0}
NUTSHELL_RPC_URL = "https://api.nutshell.com/v1/json"


def _auth_headers() -> Dict[str, str]:
    """
    Nutshell JSON-RPC uses HTTP Basic Auth: username (email/domain) + API key. :contentReference[oaicite:1]{index=1}
    We'll read:
      - settings.nutshell_username
      - settings.nutshell_api_key
    """
    user = settings.nutshell_username
    api_key = settings.nutshell_api_key
    creds = f"{user}:{api_key}".encode("utf-8")
    token = base64.b64encode(creds).decode("utf-8")
    return {
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json",
    }


async def _rpc(method: str, params: Dict[str, Any]) -> Any:
    payload = {
        "method": method,
        "params": params,
        "id": f"{method}-1",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(NUTSHELL_RPC_URL, headers=_auth_headers(), content=json.dumps(payload))
        r.raise_for_status()
        data = r.json()
        if "error" in data and data["error"]:
            raise RuntimeError(f"Nutshell RPC error: {data['error']}")
        return data.get("result")


async def list_users() -> List[Dict[str, Any]]:
    """
    Equivalent to HubSpot owners or Pipedrive users.
    Uses findUsers via JSON-RPC. :contentReference[oaicite:2]{index=2}
    """
    users = await _rpc("findUsers", {"query": {}})
    out: List[Dict[str, Any]] = []
    for u in users or []:
        out.append(
            {
                "id": str(u.get("id")),
                "name": u.get("name") or "",
                "email": (u.get("email") or "").lower(),
                "active": bool(u.get("isActive", True)),
            }
        )
    return out


def _cutoff_iso(days: int) -> str:
    # Nutshell stores timestamps in ISO-like strings; we use UTC window
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


async def count_new_leads(owner_id: Optional[int], days: int) -> int:
    """
    Count leads created in the last N days for a given owner.
    Uses findLeads with a query filter. Shape is similar to other examples
    like newLead/editLead in docs. :contentReference[oaicite:3]{index=3}
    """
    cutoff = _cutoff_iso(days)
    query: Dict[str, Any] = {
        "query": {
            "modifiedTime": {"min": cutoff},
        },
    }
    # If you want strict creation-time, check docs for the exact field;
    # using modifiedTime as a safe window starter.
    if owner_id is not None:
        query["query"]["owner"] = {"id": owner_id}

    leads = await _rpc("findLeads", query)
    return len(leads or [])


async def count_activities(owner_id: Optional[int], days: int) -> Dict[str, int]:
    """
    Rough equivalent of emails/calls/meetings from Activities.
    Nutshell has Activities / Tasks; you'll refine types once you inspect your data. :contentReference[oaicite:4]{index=4}
    """
    cutoff = _cutoff_iso(days)
    query: Dict[str, Any] = {
        "query": {
            "updatedTime": {"min": cutoff},
        },
    }
    if owner_id is not None:
        query["query"]["user"] = {"id": owner_id}

    activities = await _rpc("findActivities", query)
    emails = calls = meetings = 0
    for a in activities or []:
        typ = (a.get("type") or "").lower()
        if "email" in typ:
            emails += 1
        elif "call" in typ or "phone" in typ:
            calls += 1
        elif "meeting" in typ or "appointment" in typ:
            meetings += 1
    return {
        "emails": emails,
        "calls": calls,
        "meetings": meetings,
    }


async def owners_stats(days: int, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Match the shape of HubSpot/Pipedrive/Salesforce stats:
    [
      {
        "owner_id": "...",
        "owner_name": "...",
        "owner_email": "...",
        "emails_last_n_days": int,
        "calls_last_n_days": int,
        "meetings_last_n_days": int,
        "new_deals_last_n_days": int,   # here based on Nutshell leads
      },
      ...
    ]
    """
    users = await list_users()
    if owner_id is not None:
        selected = [u for u in users if str(u.get("id")) == str(owner_id)]
    else:
        selected = [u for u in users if u.get("active")]

    out: List[Dict[str, Any]] = []
    for u in selected:
        oid_int = int(u["id"])
        act_counts = await count_activities(owner_id=oid_int, days=days)
        new_leads = await count_new_leads(owner_id=oid_int, days=days)

        out.append(
            {
                "owner_id": str(u["id"]),
                "owner_name": u.get("name") or "",
                "owner_email": u.get("email") or "",
                "emails_last_n_days": act_counts["emails"],
                "calls_last_n_days": act_counts["calls"],
                "meetings_last_n_days": act_counts["meetings"],
                # Map Nutshell leads into your "new_deals_last_n_days" KPI slot
                "new_deals_last_n_days": new_leads,
            }
        )
    return out


async def create_lead(description: str, contact_name: str = "", contact_email: str = "") -> Dict[str, Any]:
    """
    Minimal newLead wrapper so Site2CRM can push a new lead into Nutshell. :contentReference[oaicite:5]{index=5}
    """
    lead_payload: Dict[str, Any] = {
        "lead": {
            "description": description,
        }
    }
    if contact_name or contact_email:
        lead_payload["lead"]["primaryContact"] = {
            "name": contact_name or contact_email or "New Lead",
        }
        if contact_email:
            lead_payload["lead"]["primaryContact"]["email"] = contact_email

    result = await _rpc("newLead", lead_payload)
    return result or {}
