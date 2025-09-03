# app/services/integrations.py
from typing import Optional
from sqlalchemy.orm import Session
from app.db import models
from app.core.config import settings

def _get_org_token(db: Session, org_id: int, provider: str) -> Optional[str]:
    """
    Latest active token for this org+provider, or None.
    """
    q = (
        db.query(models.IntegrationCredential.access_token)
        .filter(
            models.IntegrationCredential.organization_id == org_id,
            models.IntegrationCredential.provider == provider,
            models.IntegrationCredential.is_active == True,  # noqa: E712
        )
        .order_by(models.IntegrationCredential.updated_at.desc())
    )
    row = q.first()
    return row[0] if row else None

def choose_hubspot_token(db: Optional[Session], org_id: Optional[int]) -> Optional[str]:
    """
    Org token if present, otherwise fallback to env.
    """
    if db and org_id:
        t = _get_org_token(db, org_id, "hubspot")
        if t:
            return t
    return getattr(settings, "hubspot_api_key", None) or None

def choose_pipedrive_token(db: Optional[Session], org_id: Optional[int]) -> Optional[str]:
    """
    Org token if present, otherwise fallback to env.
    """
    if db and org_id:
        t = _get_org_token(db, org_id, "pipedrive")
        if t:
            return t
    return getattr(settings, "pipedrive_api_token", None) or None
