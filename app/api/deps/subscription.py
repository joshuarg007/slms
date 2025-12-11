# app/api/deps/subscription.py
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import models
from app.services.subscription import org_has_active_subscription
from app.api.deps.auth import get_current_user, get_db  # ← changed import


def require_active_subscription(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Organization:
    """
    Dependency that ensures the caller's organization has an active (or trialing) subscription.
    Returns the org for convenience; raises HTTP 402 otherwise.
    """
    org = db.get(models.Organization, current_user.organization_id)
    if not org or not org_has_active_subscription(org):
        # 402 = Payment Required (lets the SPA show an upgrade flow)
        raise HTTPException(status_code=402, detail="Upgrade required")
    return org
