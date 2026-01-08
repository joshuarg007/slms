# app/api/routes/integrations.py
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import models
from app.api.deps.auth import get_db, get_current_user

router = APIRouter(prefix="/integrations", tags=["Integrations"])

Provider = Literal["hubspot", "pipedrive", "salesforce", "nutshell", "zoho"]
AuthType = Literal["pat", "api_key", "oauth"]


class CredIn(BaseModel):
    provider: Provider
    access_token: str
    auth_type: AuthType = "pat"
    activate: bool = True  # if true, mark this credential active and others (same provider) inactive


class CredOut(BaseModel):
    id: int
    provider: Provider
    auth_type: AuthType
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # never return full tokens; optional hint for UI:
    token_suffix: Optional[str] = None  # last 4 chars, if you want


@router.get("/credentials", response_model=List[CredOut])
def list_credentials(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    rows: List[models.IntegrationCredential] = (
        db.query(models.IntegrationCredential)
        .filter(models.IntegrationCredential.organization_id == org_id)
        .order_by(
            models.IntegrationCredential.provider.asc(),
            models.IntegrationCredential.updated_at.desc(),
        )
        .all()
    )
    out: List[CredOut] = []
    for r in rows:
        token_suffix = r.access_token[-4:] if r.access_token else None
        out.append(
            CredOut(
                id=r.id,
                provider=r.provider,  # type: ignore[arg-type]
                auth_type=(r.auth_type or "pat"),  # type: ignore[arg-type]
                is_active=bool(r.is_active),
                created_at=r.created_at.isoformat() if r.created_at else None,
                updated_at=r.updated_at.isoformat() if r.updated_at else None,
                token_suffix=token_suffix,
            )
        )
    return out


@router.post("/credentials", response_model=CredOut, status_code=201)
def upsert_credential(
    payload: CredIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    # Optionally deactivate other credentials for this provider
    if payload.activate:
        db.query(models.IntegrationCredential).filter(
            models.IntegrationCredential.organization_id == org_id,
            models.IntegrationCredential.provider == payload.provider,
            models.IntegrationCredential.is_active == True,  # noqa: E712
        ).update({models.IntegrationCredential.is_active: False})

    # Upsert: if there’s already a row with same provider+org+auth_type,
    # update it; else insert a new one.
    existing = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org_id,
            models.IntegrationCredential.provider == payload.provider,
            models.IntegrationCredential.auth_type == payload.auth_type,
        )
        .order_by(models.IntegrationCredential.updated_at.desc())
        .first()
    )

    if existing:
        existing.access_token = payload.access_token
        existing.is_active = bool(payload.activate)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        row = existing
    else:
        row = models.IntegrationCredential(
            organization_id=org_id,
            provider=payload.provider,
            auth_type=payload.auth_type,
            access_token=payload.access_token,
            is_active=bool(payload.activate),
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    return CredOut(
        id=row.id,
        provider=row.provider,  # type: ignore[arg-type]
        auth_type=(row.auth_type or "pat"),  # type: ignore[arg-type]
        is_active=bool(row.is_active),
        created_at=row.created_at.isoformat() if row.created_at else None,
        updated_at=row.updated_at.isoformat() if row.updated_at else None,
        token_suffix=(row.access_token[-4:] if row.access_token else None),
    )


# 🔹 ALLOW ALL CRMs AS ACTIVE
CRMProvider = Literal["hubspot", "pipedrive", "salesforce", "nutshell", "zoho"]


class ActiveCRMOut(BaseModel):
    provider: CRMProvider


class ActiveCRMIn(BaseModel):
    provider: CRMProvider


@router.get("/crm/active", response_model=ActiveCRMOut)
def get_active_crm(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.get(models.Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    provider = (org.active_crm or "hubspot")  # type: ignore[assignment]
    return ActiveCRMOut(provider=provider)  # type: ignore[arg-type]


@router.post("/crm/active", response_model=ActiveCRMOut)
def set_active_crm(
    payload: ActiveCRMIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.get(models.Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.active_crm = payload.provider  # type: ignore[assignment]
    db.add(org)
    db.commit()
    db.refresh(org)
    return ActiveCRMOut(provider=org.active_crm)  # type: ignore[arg-type]
