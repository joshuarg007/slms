# app/api/routes/pipedrive_stats.py
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.db import models
from app.integrations import pipedrive as pd

router = APIRouter(prefix="/integrations/pipedrive/salespeople", tags=["Pipedrive"])


@router.get("/owners")
async def owners(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get list of Pipedrive users/owners for the organization."""
    try:
        return await pd.get_owners(organization_id=user.organization_id)
    except Exception as e:
        raise HTTPException(400, detail=f"Pipedrive error: {e}") from e


@router.get("/stats")
async def stats(
    days: int = Query(7, ge=1, le=365),
    owner_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get salespeople stats from Pipedrive for the organization."""
    try:
        results = await pd.get_salespeople_stats(
            days=days,
            owner_id=owner_id,
            organization_id=user.organization_id,
        )
        return {"days": days, "results": results}
    except Exception as e:
        raise HTTPException(400, detail=f"Pipedrive error: {e}") from e


@router.get("/health")
async def health(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Check Pipedrive connection health for the organization."""
    ok_users = False
    try:
        u = await pd.get_owners(organization_id=user.organization_id)
        ok_users = isinstance(u, list) and len(u) >= 0
    except Exception:
        ok_users = False
    return {"users_ok": ok_users}
