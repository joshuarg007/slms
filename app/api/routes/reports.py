# app/api/routes/reports.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import models
from app.api.deps.auth import get_db, get_current_user
from app.api.deps.subscription import require_active_subscription

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/overview")
def reports_overview(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Free/overview report."""
    org_id = current_user.organization_id
    total = db.query(models.Lead).filter(models.Lead.organization_id == org_id).count()
    return {"ok": True, "total_leads": total}

@router.get("/pro")
def reports_pro(
    org: models.Organization = Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """
    Pro-only report. The require_active_subscription dependency ensures the org
    has an active/trialing subscription; otherwise it raises HTTP 402.
    """
    # Example payload; expand with your premium analytics.
    return {
        "ok": True,
        "org_id": org.id,
        "note": "Pro-only content available because your subscription is active.",
    }
