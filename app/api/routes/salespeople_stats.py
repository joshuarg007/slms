# app/api/routes/salespeople_stats.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.db import models
from app.schemas.salesperson import SalespersonStatsResponse

# Providers
from app.integrations import hubspot
# from app.integrations import pipedrive  # wire in later
from app.integrations import salesforce   # our new stub

router = APIRouter(prefix="/salespeople", tags=["Salespeople"])

@router.get("/stats", response_model=SalespersonStatsResponse)
async def unified_salespeople_stats(
    days: int = Query(7, ge=1, le=365),
    owner_id: Optional[str] = Query(None),
    owner_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> SalespersonStatsResponse:
    """
    Dispatches to the org's active CRM:
      - hubspot    -> app.integrations.hubspot.get_salespeople_stats
      - pipedrive  -> (TODO)
      - salesforce -> app.integrations.salesforce.get_salespeople_stats (stub for now)
    """
    org = db.query(models.Organization).get(current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    provider = (org.active_crm or "hubspot").lower()

    if provider == "hubspot":
        results = await hubspot.get_salespeople_stats(days=days)

    elif provider == "pipedrive":
        # TODO: implement and import pipedrive.get_salespeople_stats
        raise HTTPException(status_code=501, detail="Pipedrive stats not implemented yet")

    elif provider == "salesforce":
        # ✅ calls the stub we just added (returns [])
        results = await salesforce.get_salespeople_stats(db=db, org_id=org.id, days=days)

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported CRM provider: {provider}")

    # Optional owner filtering (same behavior as your HubSpot route)
    if owner_id:
        results = [r for r in results if str(r.get("owner_id")) == str(owner_id)]
    elif owner_email:
        eml = owner_email.strip().lower()
        results = [r for r in results if (r.get("owner_email") or "").lower() == eml]

    return SalespersonStatsResponse(days=days, results=results)
