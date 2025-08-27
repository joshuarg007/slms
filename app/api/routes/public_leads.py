import re
from typing import Optional, Tuple

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.integrations import hubspot

router = APIRouter(prefix="/public", tags=["public"])


class LeadPublicIn(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    organization_id: Optional[int] = None


def _split_name(name: Optional[str]) -> Tuple[str, str]:
    if not name:
        return "", ""
    parts = name.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


@router.post("/leads")
async def public_create_lead(payload: LeadPublicIn):
    # pass-through to HubSpot; on duplicate, quietly update instead
    first = payload.first_name or ""
    last = payload.last_name or ""
    if (not first or not last) and payload.name:
        f2, l2 = _split_name(payload.name)
        first = first or f2
        last = last or l2

    try:
        res = await hubspot.create_contact(
            email=str(payload.email),
            first_name=first,
            last_name=last,
            phone=payload.phone or "",
            company=payload.company or "",
        )
        return {
            "status": "ok",
            "hubspot_contact_id": str(res.get("id") or res.get("hs_object_id") or ""),
            "email": str(payload.email),
        }

    except httpx.HTTPStatusError as e:
        existing_id = ""
        msg = ""
        try:
            data = e.response.json()
            msg = data.get("message") or ""
            m = re.search(r"Existing ID:\s*([0-9]+)", msg)
            if m:
                existing_id = m.group(1)
        except Exception:
            pass

        if (getattr(e.response, "status_code", None) == 409) or ("already exists" in msg.lower()):
            props = {}
            if first:
                props["firstname"] = first
            if last:
                props["lastname"] = last
            if payload.phone:
                props["phone"] = payload.phone
            if payload.company:
                props["company"] = payload.company  # store plain company name

            try:
                contact_id = existing_id
                if not contact_id:
                    found = await hubspot.search_contact_by_email(str(payload.email))
                    contact_id = str(found.get("id")) if found else ""
                if contact_id and props:
                    await hubspot.update_contact(contact_id, props)
                return {
                    "status": "updated" if props and contact_id else "exists",
                    "hubspot_contact_id": contact_id,
                    "email": str(payload.email),
                }
            except Exception:
                return {
                    "status": "exists",
                    "hubspot_contact_id": existing_id or "",
                    "email": str(payload.email),
                }

        detail = getattr(e.response, "text", str(e))
        raise HTTPException(status_code=502, detail=f"HubSpot error: {detail}")
