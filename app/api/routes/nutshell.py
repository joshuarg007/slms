# app/api/routes/nutshell.py
"""
Nutshell CRM API key integration for Site2CRM.

Unlike OAuth CRMs, Nutshell uses simple API key authentication.
This provides consistent endpoints for test/disconnect like OAuth CRMs.
"""
from __future__ import annotations

from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.db import models
from app.integrations import nutshell as nutshell_integration

router = APIRouter(prefix="/integrations/nutshell", tags=["Integrations: Nutshell"])


@router.get("/salespeople")
async def nutshell_salespeople(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """
    Get Nutshell users (salespeople).
    Used to test connection and populate owner dropdowns.
    """
    org_id = user.organization_id

    # Check for active credential
    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org_id,
            models.IntegrationCredential.provider == "nutshell",
            models.IntegrationCredential.is_active == True,  # noqa: E712
        )
        .first()
    )

    if not cred:
        raise HTTPException(status_code=400, detail="No Nutshell API key configured")

    result = await nutshell_integration.get_owners(organization_id=org_id)

    # Check for warning (invalid API key)
    if isinstance(result, dict) and "warning" in result:
        raise HTTPException(status_code=401, detail=result["warning"])

    return result


@router.delete("/disconnect")
def nutshell_disconnect(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Disconnect Nutshell integration.
    Deactivates API key credentials.
    """
    org_id = user.organization_id

    updated = db.query(models.IntegrationCredential).filter(
        models.IntegrationCredential.organization_id == org_id,
        models.IntegrationCredential.provider == "nutshell",
        models.IntegrationCredential.is_active == True,  # noqa: E712
    ).update({models.IntegrationCredential.is_active: False})

    db.commit()

    return {"status": "ok", "disconnected": updated > 0}
