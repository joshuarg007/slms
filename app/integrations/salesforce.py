# app/integrations/salesforce.py
from __future__ import annotations

from typing import List, Dict, Any, Optional, Tuple

import httpx
import json
import os
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db import models
from app.db.session import SessionLocal  # for background tasks

API_VERSION = os.getenv("SALESFORCE_API_VERSION", "60.0")  # safe default


def _get_active_sf_credential(db: Session, org_id: int) -> Tuple[str, str]:
    """
    Returns (access_token, instance_url).

    We expect instance_url to be saved during OAuth in one of:
      - IntegrationCredential.scopes as JSON '{"instance_url":"..."}'
      - or env SALESFORCE_INSTANCE_URL as a fallback.

    The access token should be the Bearer token stored in access_token.
    """
    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org_id,
            models.IntegrationCredential.provider == "salesforce",
            models.IntegrationCredential.is_active == True,  # noqa: E712
        )
        .order_by(models.IntegrationCredential.updated_at.desc())
        .first()
    )
    if not cred or not cred.access_token:
        raise HTTPException(status_code=400, detail="No active Salesforce credential configured")

    # Attempt to extract instance_url from scopes JSON (cheap stash spot),
    # else fallback to env for local dev.
    instance_url: Optional[str] = None
    if cred.scopes:
        try:
            meta = json.loads(cred.scopes)
            instance_url = meta.get("instance_url") or meta.get("instanceUrl")
        except Exception:
            pass
    if not instance_url:
        instance_url = os.getenv("SALESFORCE_INSTANCE_URL")

    if not instance_url:
        raise HTTPException(
            status_code=400,
            detail="Salesforce instance_url not found; please reconnect Salesforce (or set SALESFORCE_INSTANCE_URL).",
        )

    return cred.access_token, instance_url.rstrip("/")


async def _sf_query(instance_url: str, access_token: str, soql: str) -> Dict[str, Any]:
    url = f"{instance_url}/services/data/v{API_VERSION}/query"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"q": soql}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url, headers=headers, params=params)
        if r.status_code >= 400:
            # surface the SF error text for debugging
            raise HTTPException(status_code=502, detail=f"Salesforce error {r.status_code}: {r.text}")
        return r.json()


def _last_n_days_clause(days: int) -> str:
    # SOQL supports LAST_N_DAYS:n literal
    return f"LAST_N_DAYS:{days}"


def _merge_counts(
    base: Dict[str, Dict[str, Any]],
    key: str,
    rows: List[Dict[str, Any]],
    id_field: str = "OwnerId",
):
    """
    Merge aggregate counts into the owner map.
    rows should have fields: OwnerId + expr0 (COUNT).
    """
    for row in rows:
        owner_id = row.get(id_field)
        count = row.get("expr0") or row.get("cnt") or 0
        if owner_id is None:
            continue
        entry = base.setdefault(
            owner_id,
            {
                "owner_id": owner_id,
                "owner_name": None,
                "owner_email": None,
                "emails_last_n_days": 0,
                "calls_last_n_days": 0,
                "meetings_last_n_days": 0,
                "new_deals_last_n_days": 0,
            },
        )
        entry[key] = int(count) if isinstance(count, (int, float)) else int(str(count))


def _hydrate_owner_meta(owner_map: Dict[str, Dict[str, Any]], user_rows: List[Dict[str, Any]]):
    meta = {u.get("Id"): u for u in user_rows}
    for oid, entry in owner_map.items():
        u = meta.get(oid)
        if not u:
            continue
        entry["owner_name"] = u.get("Name")
        entry["owner_email"] = u.get("Email")


async def get_salespeople_stats(*, db: Session, org_id: int, days: int) -> List[Dict[str, Any]]:
    """
    Compute KPIs per owner for the last N days:
      - emails_last_n_days   (Task: TaskSubtype='Email' OR Type='Email')
      - calls_last_n_days    (Task: TaskSubtype='Call'  OR Type='Call')
      - meetings_last_n_days (Event: StartDateTime in last N days)
      - new_deals_last_n_days (Opportunity: CreatedDate in last N days)

    Returns a list of rows compatible with your HubSpot stats schema.
    """
    access_token, instance_url = _get_active_sf_credential(db, org_id)
    window = _last_n_days_clause(days)

    owner_map: Dict[str, Dict[str, Any]] = {}

    # --- Emails (Task) ---
    # Prefer TaskSubtype when available; OR fallback to Type
    soql_emails = (
        "SELECT OwnerId, COUNT(Id) "
        "FROM Task "
        f"WHERE CreatedDate = {window} AND "
        "(TaskSubtype = 'Email' OR Type = 'Email') "
        "GROUP BY OwnerId"
    )
    emails = await _sf_query(instance_url, access_token, soql_emails)
    _merge_counts(owner_map, "emails_last_n_days", emails.get("records", []))

    # --- Calls (Task) ---
    soql_calls = (
        "SELECT OwnerId, COUNT(Id) "
        "FROM Task "
        f"WHERE CreatedDate = {window} AND "
        "(TaskSubtype = 'Call' OR Type = 'Call') "
        "GROUP BY OwnerId"
    )
    calls = await _sf_query(instance_url, access_token, soql_calls)
    _merge_counts(owner_map, "calls_last_n_days", calls.get("records", []))

    # --- Meetings (Event) ---
    # We treat any Event in the window as a meeting; you can tighten with Type if your org uses it.
    soql_meetings = (
        "SELECT OwnerId, COUNT(Id) "
        "FROM Event "
        f"WHERE StartDateTime = {window} "
        "GROUP BY OwnerId"
    )
    meetings = await _sf_query(instance_url, access_token, soql_meetings)
    _merge_counts(owner_map, "meetings_last_n_days", meetings.get("records", []))

    # --- New Deals (Opportunity) ---
    soql_deals = (
        "SELECT OwnerId, COUNT(Id) "
        "FROM Opportunity "
        f"WHERE CreatedDate = {window} "
        "GROUP BY OwnerId"
    )
    deals = await _sf_query(instance_url, access_token, soql_deals)
    _merge_counts(owner_map, "new_deals_last_n_days", deals.get("records", []))

    # If nothing found, short-circuit
    if not owner_map:
        return []

    # Hydrate owner name/email
    owner_ids = ",".join([f"'{oid}'" for oid in owner_map.keys() if oid])
    soql_users = f"SELECT Id, Name, Email FROM User WHERE Id IN ({owner_ids})"
    users = await _sf_query(instance_url, access_token, soql_users)
    _hydrate_owner_meta(owner_map, users.get("records", []))

    # Stable order: by owner_name then owner_id
    rows = list(owner_map.values())
    rows.sort(key=lambda r: (r.get("owner_name") or "", r.get("owner_id") or ""))
    return rows


async def create_lead(
    *,
    org_id: int,
    email: str,
    first_name: str = "",
    last_name: str = "",
    company: str = "",
) -> Dict[str, Any]:
    """
    Create a Lead in Salesforce for the given org.
    Uses the active Salesforce IntegrationCredential for that org.
    Intended to be called from a FastAPI BackgroundTask.
    """
    if not email:
        raise HTTPException(status_code=400, detail="Salesforce lead requires an email")

    # open a short-lived session just for this background task
    db = SessionLocal()
    try:
        access_token, instance_url = _get_active_sf_credential(db, org_id)
    finally:
        db.close()

    first = first_name or ""
    last = last_name or "Unknown"
    comp = company or "Unknown"

    payload = {
        "FirstName": first,
        "LastName": last,
        "Email": email,
        "Company": comp,
    }

    url = f"{instance_url}/services/data/v{API_VERSION}/sobjects/Lead"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Salesforce lead create failed: {r.text}")
        return r.json() or {}
