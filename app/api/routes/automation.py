# app/api/routes/automation.py
"""Automation API routes for lead assignment and workflow automation."""

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db import models
from app.db.session import SessionLocal
from app.services.automation import (
    AssignmentStrategy,
    LeadAssignmentService,
    AutomationRulesService,
    get_assignment_preview,
)

router = APIRouter(prefix="/automation", tags=["Automation"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# Request/Response Models
# ============================================================================

class AssignmentPreview(BaseModel):
    user_id: int
    display_name: str
    current_workload: int
    close_rate: float
    estimated_assignment_pct: float


class AssignmentPreviewResponse(BaseModel):
    strategy: str
    strategy_description: str
    salespeople: List[AssignmentPreview]
    unassigned_leads: int


class AssignLeadRequest(BaseModel):
    lead_id: int
    strategy: Optional[str] = "best_fit"


class AssignLeadResponse(BaseModel):
    lead_id: int
    assigned_to_user_id: int
    assigned_to_name: str
    strategy_used: str


class BulkAssignRequest(BaseModel):
    strategy: Optional[str] = "best_fit"
    limit: Optional[int] = 100


class BulkAssignResponse(BaseModel):
    assignments_made: int
    assignments: List[AssignLeadResponse]


class AutomationSettings(BaseModel):
    auto_assign_enabled: bool
    assignment_strategy: str
    notify_on_assignment: bool
    daily_digest_enabled: bool
    weekly_recommendations_enabled: bool


class AutomationSettingsUpdate(BaseModel):
    auto_assign_enabled: Optional[bool] = None
    assignment_strategy: Optional[str] = None
    notify_on_assignment: Optional[bool] = None
    daily_digest_enabled: Optional[bool] = None
    weekly_recommendations_enabled: Optional[bool] = None


STRATEGY_DESCRIPTIONS = {
    "round_robin": "Distribute leads evenly across all salespeople in rotation",
    "weighted_performance": "Assign more leads to salespeople with higher close rates",
    "lowest_workload": "Assign to the salesperson with the fewest active leads",
    "best_fit": "Smart assignment based on performance, workload, and activity",
}


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/strategies")
def list_strategies():
    """List available lead assignment strategies."""
    return [
        {
            "id": strategy.value,
            "name": strategy.value.replace("_", " ").title(),
            "description": STRATEGY_DESCRIPTIONS.get(strategy.value, ""),
        }
        for strategy in AssignmentStrategy
    ]


@router.get("/preview", response_model=AssignmentPreviewResponse)
def preview_assignment(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    strategy: str = Query(default="best_fit"),
):
    """Preview how leads would be distributed with the given strategy."""

    try:
        strategy_enum = AssignmentStrategy(strategy)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid strategy: {strategy}")

    org_id = user.organization_id

    # Get preview
    preview = get_assignment_preview(db, org_id, strategy_enum)

    # Count unassigned leads
    unassigned = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.assigned_user_id.is_(None),
    ).count()

    return AssignmentPreviewResponse(
        strategy=strategy,
        strategy_description=STRATEGY_DESCRIPTIONS.get(strategy, ""),
        salespeople=[AssignmentPreview(**p) for p in preview],
        unassigned_leads=unassigned,
    )


@router.post("/assign", response_model=AssignLeadResponse)
def assign_single_lead(
    request: AssignLeadRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Assign a single lead using the specified strategy."""

    # Get the lead
    lead = db.query(models.Lead).filter(
        models.Lead.id == request.lead_id,
        models.Lead.organization_id == user.organization_id,
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    try:
        strategy_enum = AssignmentStrategy(request.strategy)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid strategy: {request.strategy}")

    # Assign
    service = LeadAssignmentService(db, user.organization_id)
    assigned_sp = service.assign_lead(lead, strategy_enum)

    if not assigned_sp:
        raise HTTPException(status_code=400, detail="No salespeople available for assignment")

    db.commit()

    return AssignLeadResponse(
        lead_id=lead.id,
        assigned_to_user_id=assigned_sp.user_id,
        assigned_to_name=assigned_sp.display_name,
        strategy_used=request.strategy,
    )


@router.post("/assign-bulk", response_model=BulkAssignResponse)
def bulk_assign_leads(
    request: BulkAssignRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Bulk assign all unassigned leads using the specified strategy."""

    try:
        strategy_enum = AssignmentStrategy(request.strategy)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid strategy: {request.strategy}")

    service = LeadAssignmentService(db, user.organization_id)
    assignments = service.bulk_assign_unassigned_leads(strategy_enum, request.limit)

    return BulkAssignResponse(
        assignments_made=len(assignments),
        assignments=[
            AssignLeadResponse(
                lead_id=lead.id,
                assigned_to_user_id=sp.user_id,
                assigned_to_name=sp.display_name,
                strategy_used=request.strategy,
            )
            for lead, sp in assignments
        ],
    )


@router.get("/settings", response_model=AutomationSettings)
def get_automation_settings(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get current automation settings for the organization."""
    # For now, return defaults. In production, fetch from org settings table.
    return AutomationSettings(
        auto_assign_enabled=True,
        assignment_strategy="best_fit",
        notify_on_assignment=True,
        daily_digest_enabled=False,
        weekly_recommendations_enabled=True,
    )


@router.put("/settings", response_model=AutomationSettings)
def update_automation_settings(
    settings: AutomationSettingsUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Update automation settings for the organization."""
    # For now, return the updated settings. In production, persist to org settings.
    current = AutomationSettings(
        auto_assign_enabled=settings.auto_assign_enabled if settings.auto_assign_enabled is not None else True,
        assignment_strategy=settings.assignment_strategy if settings.assignment_strategy else "best_fit",
        notify_on_assignment=settings.notify_on_assignment if settings.notify_on_assignment is not None else True,
        daily_digest_enabled=settings.daily_digest_enabled if settings.daily_digest_enabled is not None else False,
        weekly_recommendations_enabled=settings.weekly_recommendations_enabled if settings.weekly_recommendations_enabled is not None else True,
    )
    return current


@router.get("/stats")
def get_automation_stats(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get automation statistics for the organization."""
    org_id = user.organization_id

    # Count leads by assignment status
    total_leads = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id
    ).count()

    assigned_leads = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.assigned_user_id.isnot(None),
    ).count()

    unassigned_leads = total_leads - assigned_leads

    # Count active salespeople
    active_salespeople = db.query(models.Salesperson).filter(
        models.Salesperson.organization_id == org_id,
        models.Salesperson.is_active == True,
    ).count()

    # Average workload
    service = LeadAssignmentService(db, org_id)
    salespeople = service.get_active_salespeople()

    workloads = [service.get_salesperson_workload(sp.user_id) for sp in salespeople]
    avg_workload = sum(workloads) / len(workloads) if workloads else 0

    return {
        "total_leads": total_leads,
        "assigned_leads": assigned_leads,
        "unassigned_leads": unassigned_leads,
        "assignment_rate": round(assigned_leads / max(total_leads, 1) * 100, 1),
        "active_salespeople": active_salespeople,
        "avg_workload_per_rep": round(avg_workload, 1),
    }
