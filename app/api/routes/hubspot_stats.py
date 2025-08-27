import time
from typing import Optional, Literal, List

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.integrations import hubspot
from app.schemas.salesperson import SalespersonStatsResponse

router = APIRouter(prefix="/integrations/hubspot", tags=["integrations:hubspot"])


@router.get("/salespeople/stats", response_model=SalespersonStatsResponse)
async def get_salespeople_stats(
    days: int = Query(7, ge=1, le=365),
    owner_id: Optional[str] = Query(None),
    owner_email: Optional[str] = Query(None),
) -> SalespersonStatsResponse:
    # thin wrapper over the hubspot helpers
    try:
        results = await hubspot.get_salespeople_stats(days=days)

        # prefer explicit id if both are sent
        if owner_id:
            results = [r for r in results if str(r.get("owner_id")) == str(owner_id)]
        elif owner_email:
            eml = owner_email.strip().lower()
            results = [r for r in results if (r.get("owner_email") or "").lower() == eml]

        return SalespersonStatsResponse(days=days, results=results)
    except httpx.HTTPStatusError as e:
        detail = getattr(e.response, "text", str(e))
        raise HTTPException(status_code=502, detail=f"HubSpot error: {detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salespeople/raw")
async def get_salespeople_raw(
    object: Literal["deals", "appointments", "emails", "calls", "meetings"] = Query(...),
    owner_id: str = Query(...),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
):
    # raw peek for quick sanity checks
    since_ms = int((time.time() - days * 86400) * 1000)
    try:
        if object == "deals":
            props = ["dealname", "hs_owner_id", "hubspot_owner_id", "createdate", "hs_createdate"]

            # first pass: hs_owner_id + createdate
            try:
                filter_groups = [
                    {
                        "filters": [
                            {"propertyName": "hs_owner_id", "operator": "EQ", "value": str(owner_id)},
                            {"propertyName": "createdate", "operator": "GTE", "value": str(since_ms)},
                        ]
                    }
                ]
                rows = await hubspot.search_objects("deals", filter_groups, properties=props, limit=limit)
            except httpx.HTTPStatusError:
                # fallback: hubspot_owner_id + hs_createdate
                filter_groups = [
                    {
                        "filters": [
                            {"propertyName": "hubspot_owner_id", "operator": "EQ", "value": str(owner_id)},
                            {"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)},
                        ]
                    }
                ]
                rows = await hubspot.search_objects("deals", filter_groups, properties=props, limit=limit)

            items = [
                {
                    "id": r.get("id"),
                    "dealname": (r.get("properties") or {}).get("dealname"),
                    "owner_id": (r.get("properties") or {}).get("hs_owner_id")
                    or (r.get("properties") or {}).get("hubspot_owner_id"),
                    "createdate": (r.get("properties") or {}).get("createdate")
                    or (r.get("properties") or {}).get("hs_createdate"),
                }
                for r in rows
            ]

        elif object == "appointments":
            # cover both owner property names
            filter_groups = [
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
            props = ["hs_owner_id", "hubspot_owner_id", "hs_createdate"]
            rows = await hubspot.search_objects("appointments", filter_groups, properties=props, limit=limit)
            items = [
                {
                    "id": r.get("id"),
                    "owner_id": (r.get("properties") or {}).get("hs_owner_id")
                    or (r.get("properties") or {}).get("hubspot_owner_id"),
                    "hs_createdate": (r.get("properties") or {}).get("hs_createdate"),
                }
                for r in rows
            ]

        else:
            # emails/calls/meetings as engagements
            filter_groups = [
                {
                    "filters": [
                        {"propertyName": "hubspot_owner_id", "operator": "EQ", "value": str(owner_id)},
                        {"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)},
                    ]
                }
            ]
            props = ["hs_object_id", "hubspot_owner_id", "hs_createdate"]
            rows = await hubspot.search_objects(object, filter_groups, properties=props, limit=limit)
            items = [
                {
                    "id": r.get("id") or (r.get("properties") or {}).get("hs_object_id"),
                    "owner_id": (r.get("properties") or {}).get("hubspot_owner_id"),
                    "hs_createdate": (r.get("properties") or {}).get("hs_createdate"),
                }
                for r in rows
            ]

        return {"object": object, "owner_id": owner_id, "days": days, "count": len(items), "results": items}
    except httpx.HTTPStatusError as e:
        detail = getattr(e.response, "text", str(e))
        raise HTTPException(status_code=502, detail=f"HubSpot error: {detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salespeople/owners")
async def list_hubspot_owners(include_archived: bool = Query(False)) -> List[dict]:
    # thin wrapper over HubSpot owners
    try:
        owners = await hubspot.get_owners(include_archived=include_archived)
        return [
            {
                "id": str(o.get("id") or o.get("ownerId") or ""),
                "email": (o.get("user") or {}).get("email") or o.get("email") or "",
                "firstName": (o.get("user") or {}).get("firstName") or o.get("firstName") or "",
                "lastName": (o.get("user") or {}).get("lastName") or o.get("lastName") or "",
                "archived": bool(o.get("archived")),
            }
            for o in owners
        ]
    except httpx.HTTPStatusError as e:
        detail = getattr(e.response, "text", str(e))
        raise HTTPException(status_code=502, detail=f"HubSpot error: {detail}")


@router.get("/salespeople/health")
async def hubspot_health(days: int = Query(7, ge=1, le=365)) -> dict:
    # quick signal on token/scopes/data availability
    since_ms = int((time.time() - days * 86400) * 1000)
    try:
        owners = await hubspot.get_owners(False)
        owners_ok = True
    except Exception as e:
        return {"owners_ok": False, "error": str(e)}

    deals_ok = False
    try:
        fg = [{"filters": [{"propertyName": "createdate", "operator": "GTE", "value": str(since_ms)}]}]
        _ = await hubspot.search_objects("deals", fg, properties=["id"], limit=1)
        deals_ok = True
    except Exception:
        deals_ok = False

    appt_ok = False
    try:
        fg = [{"filters": [{"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)}]}]
        _ = await hubspot.search_objects("appointments", fg, properties=["hs_createdate"], limit=1)
        appt_ok = True
    except Exception:
        appt_ok = False

    sample = owners[0] if owners else {}
    return {
        "owners_ok": owners_ok,
        "owners_count": len(owners),
        "sample_owner_id": str(sample.get("id") or sample.get("ownerId") or ""),
        "deals_search_ok": deals_ok,
        "appointments_search_ok": appt_ok,
    }

@router.get("/salespeople/debug/deals")
async def debug_deals(
    owner_id: str = Query(...),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=100),
):
    # mirrors the counter: date-only search, filter owner here
    since_ms = int((time.time() - days * 86400) * 1000)
    try:
        filter_groups = [
            {"filters": [{"propertyName": "createdate", "operator": "GTE", "value": str(since_ms)}]},
            {"filters": [{"propertyName": "hs_createdate", "operator": "GTE", "value": str(since_ms)}]},
        ]
        props = ["id", "dealname", "hubspot_owner_id", "hs_owner_id", "createdate", "hs_createdate"]
        rows = await hubspot.search_objects("deals", filter_groups, properties=props, limit=limit)

        items = []
        for r in rows:
            p = r.get("properties") or {}
            oid = p.get("hubspot_owner_id") or p.get("hs_owner_id")
            if str(oid) != str(owner_id):
                continue
            items.append(
                {
                    "id": r.get("id"),
                    "dealname": p.get("dealname"),
                    "owner_id": oid,
                    "createdate": p.get("createdate") or p.get("hs_createdate"),
                }
            )

        items.sort(key=lambda x: x.get("createdate") or "", reverse=True)
        return {"owner_id": owner_id, "days": days, "count": len(items), "results": items[:limit]}
    except httpx.HTTPStatusError as e:
        detail = getattr(e.response, "text", str(e))
        raise HTTPException(status_code=502, detail=f"HubSpot error: {detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
