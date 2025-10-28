# app/api/routes/salespeople_stats_unified.py
from typing import Optional, Literal, List
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.db import models
from app.schemas.salesperson import SalespersonStatsResponse

router = APIRouter(prefix="/integrations", tags=["Integrations: Salespeople"])


# --- Lazy imports of provider helpers (so missing ones don't crash import) ---
def _hubspot_stats(days: int) -> List[dict]:
    try:
        from app.integrations import hubspot as _hs
        return _hs.get_salespeople_stats.__wrapped__(days=days) if hasattr(_hs.get_salespeople_stats, "__wrapped__") else _hs.get_salespeople_stats(days=days)  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"HubSpot integration error: {e}")

def _pipedrive_stats(days: int) -> List[dict]:
    try:
        from app.integrations import pipedrive as _pd  # you likely already have this module
        return _pd.get_salespeople_stats(days=days)  # type: ignore
    except ModuleNotFoundError:
        raise HTTPException(status_code=501, detail="Pipedrive integration not available")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Pipedrive integration error: {e}")

def _salesforce_stats(days: int) -> List[dict]:
    try:
        from app.integrations import salesforce as _sf  # if you expose a helper later
        return _sf.get_salespeople_stats(days=days)  # type: ignore
    except ModuleNotFoundError:
        raise HTTPException(status_code=501, detail="Salesforce integration not available")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Salesforce integration error: {e}")


@router.get("/salespeople/stats", response_model=SalespersonStatsResponse)
def unified_salespeople_stats(
    days: int = Query(7, ge=1, le=365),
    owner_id: Optional[str] = Query(None),
    owner_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> SalespersonStatsResponse:
    # Determine active CRM for this org
    org = db.query(models.Organization).get(user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    provider: Literal["hubspot", "pipedrive", "salesforce"] = (org.active_crm or "hubspot")  # type: ignore[assignment]

    try:
        if provider == "hubspot":
            results = _hubspot_stats(days)
        elif provider == "pipedrive":
            results = _pipedrive_stats(days)
        elif provider == "salesforce":
            results = _salesforce_stats(days)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported CRM provider: {provider}")
    except httpx.HTTPStatusError as e:
        detail = getattr(e.response, "text", str(e))
        raise HTTPException(status_code=502, detail=f"{provider} error: {detail}")

    # Optional filters (ID preferred over email)
    if owner_id:
        results = [r for r in results if str(r.get("owner_id")) == str(owner_id)]
    elif owner_email:
        eml = owner_email.strip().lower()
        results = [r for r in results if (r.get("owner_email") or "").lower() == eml]

    return SalespersonStatsResponse(days=days, results=results)
