# app/api/routes/pipedrive_stats.py
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.integrations import pipedrive as pd

router = APIRouter(prefix="/integrations/pipedrive/salespeople", tags=["Pipedrive"])

@router.get("/owners")
async def owners():
    try:
        return await pd.list_users()
    except Exception as e:
        raise HTTPException(400, detail=f"Pipedrive error: {e}") from e

@router.get("/stats")
async def stats(days: int = Query(7, ge=1, le=365), owner_id: Optional[str] = None):
    if not settings.pipedrive_api_token:
        raise HTTPException(400, detail="Missing PIPEDRIVE_API_TOKEN")
    try:
        results = await pd.owners_stats(days=days, owner_id=owner_id)
        return {"days": days, "results": results}
    except Exception as e:
        raise HTTPException(400, detail=f"Pipedrive error: {e}") from e

@router.get("/health")
async def health():
    ok_users = False
    try:
        u = await pd.list_users()
        ok_users = len(u) >= 0
    except Exception:
        ok_users = False
    return {"users_ok": ok_users}
