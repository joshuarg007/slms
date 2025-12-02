# app/services/automation.py
"""Automation services for lead assignment and scheduled tasks."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Literal
from enum import Enum

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import models


class AssignmentStrategy(str, Enum):
    ROUND_ROBIN = "round_robin"
    WEIGHTED_PERFORMANCE = "weighted_performance"
    LOWEST_WORKLOAD = "lowest_workload"
    BEST_FIT = "best_fit"  # Combines workload + performance


class LeadAssignmentService:
    """Service for automatic lead assignment to salespeople."""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self._last_assigned_index = 0

    def get_active_salespeople(self) -> list[models.Salesperson]:
        """Get all active salespeople in the organization."""
        return self.db.query(models.Salesperson).filter(
            models.Salesperson.organization_id == self.org_id,
            models.Salesperson.is_active == True,
        ).all()

    def get_salesperson_workload(self, user_id: int) -> int:
        """Get current number of active (non-closed) leads for a salesperson."""
        return self.db.query(models.Lead).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.assigned_user_id == user_id,
            models.Lead.status.notin_([models.LEAD_STATUS_WON, models.LEAD_STATUS_LOST]),
        ).count()

    def get_salesperson_close_rate(self, user_id: int, days: int = 90) -> float:
        """Get close rate for a salesperson over the last N days."""
        start_date = datetime.utcnow() - timedelta(days=days)

        won = self.db.query(models.Lead).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.assigned_user_id == user_id,
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.closed_at >= start_date,
        ).count()

        lost = self.db.query(models.Lead).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.assigned_user_id == user_id,
            models.Lead.status == models.LEAD_STATUS_LOST,
            models.Lead.closed_at >= start_date,
        ).count()

        total = won + lost
        return (won / total * 100) if total > 0 else 0

    def assign_round_robin(self, lead: models.Lead) -> Optional[models.Salesperson]:
        """Assign lead using round-robin strategy."""
        salespeople = self.get_active_salespeople()
        if not salespeople:
            return None

        # Get or initialize the assignment index from org settings
        # For simplicity, we'll use a simple modulo approach
        count = len(salespeople)

        # Find the salesperson with the oldest last assignment
        last_assignments = []
        for sp in salespeople:
            last_lead = self.db.query(models.Lead).filter(
                models.Lead.assigned_user_id == sp.user_id,
                models.Lead.organization_id == self.org_id,
            ).order_by(models.Lead.created_at.desc()).first()

            last_time = last_lead.created_at if last_lead else datetime.min
            last_assignments.append((sp, last_time))

        # Sort by last assignment time (oldest first)
        last_assignments.sort(key=lambda x: x[1])

        selected = last_assignments[0][0]
        lead.assigned_user_id = selected.user_id
        return selected

    def assign_weighted_performance(self, lead: models.Lead) -> Optional[models.Salesperson]:
        """Assign lead weighted by performance (higher close rate = more leads)."""
        salespeople = self.get_active_salespeople()
        if not salespeople:
            return None

        # Calculate weights based on close rate
        weights = []
        for sp in salespeople:
            close_rate = self.get_salesperson_close_rate(sp.user_id)
            # Minimum weight of 10 to ensure everyone gets some leads
            weight = max(close_rate, 10)
            weights.append((sp, weight))

        # Calculate total weight
        total_weight = sum(w for _, w in weights)

        # Select based on weighted probability
        import random
        r = random.uniform(0, total_weight)
        cumulative = 0
        for sp, weight in weights:
            cumulative += weight
            if r <= cumulative:
                lead.assigned_user_id = sp.user_id
                return sp

        # Fallback to first
        selected = weights[0][0]
        lead.assigned_user_id = selected.user_id
        return selected

    def assign_lowest_workload(self, lead: models.Lead) -> Optional[models.Salesperson]:
        """Assign lead to salesperson with lowest current workload."""
        salespeople = self.get_active_salespeople()
        if not salespeople:
            return None

        workloads = []
        for sp in salespeople:
            workload = self.get_salesperson_workload(sp.user_id)
            workloads.append((sp, workload))

        # Sort by workload (lowest first)
        workloads.sort(key=lambda x: x[1])

        selected = workloads[0][0]
        lead.assigned_user_id = selected.user_id
        return selected

    def assign_best_fit(self, lead: models.Lead) -> Optional[models.Salesperson]:
        """
        Assign using best fit algorithm that combines:
        - Close rate (higher is better)
        - Current workload (lower is better)
        - Recent activity (more active is better)
        """
        salespeople = self.get_active_salespeople()
        if not salespeople:
            return None

        scores = []
        for sp in salespeople:
            # Get metrics
            close_rate = self.get_salesperson_close_rate(sp.user_id)
            workload = self.get_salesperson_workload(sp.user_id)

            # Get recent activity count
            week_ago = datetime.utcnow() - timedelta(days=7)
            activity_count = self.db.query(models.LeadActivity).filter(
                models.LeadActivity.user_id == sp.user_id,
                models.LeadActivity.organization_id == self.org_id,
                models.LeadActivity.activity_at >= week_ago,
            ).count()

            # Calculate score (higher is better)
            # Normalize workload (invert so lower workload = higher score)
            max_workload = 50  # Cap for normalization
            workload_score = max(0, (max_workload - workload) / max_workload * 100)

            # Activity score (more is better, capped at 50)
            activity_score = min(activity_count, 50) * 2

            # Combined score
            total_score = (
                close_rate * 0.4 +  # 40% weight on close rate
                workload_score * 0.4 +  # 40% weight on capacity
                activity_score * 0.2  # 20% weight on activity
            )

            scores.append((sp, total_score))

        # Sort by score (highest first)
        scores.sort(key=lambda x: x[1], reverse=True)

        selected = scores[0][0]
        lead.assigned_user_id = selected.user_id
        return selected

    def assign_lead(
        self,
        lead: models.Lead,
        strategy: AssignmentStrategy = AssignmentStrategy.BEST_FIT,
    ) -> Optional[models.Salesperson]:
        """Assign a lead using the specified strategy."""

        if strategy == AssignmentStrategy.ROUND_ROBIN:
            return self.assign_round_robin(lead)
        elif strategy == AssignmentStrategy.WEIGHTED_PERFORMANCE:
            return self.assign_weighted_performance(lead)
        elif strategy == AssignmentStrategy.LOWEST_WORKLOAD:
            return self.assign_lowest_workload(lead)
        elif strategy == AssignmentStrategy.BEST_FIT:
            return self.assign_best_fit(lead)
        else:
            return self.assign_round_robin(lead)

    def bulk_assign_unassigned_leads(
        self,
        strategy: AssignmentStrategy = AssignmentStrategy.BEST_FIT,
        limit: int = 100,
    ) -> list[tuple[models.Lead, models.Salesperson]]:
        """Assign all unassigned leads using the specified strategy."""

        unassigned = self.db.query(models.Lead).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.assigned_user_id.is_(None),
        ).limit(limit).all()

        assignments = []
        for lead in unassigned:
            sp = self.assign_lead(lead, strategy)
            if sp:
                assignments.append((lead, sp))

        self.db.commit()
        return assignments


class AutomationRulesService:
    """Service for managing automation rules and triggers."""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id

    def should_auto_assign(self) -> bool:
        """Check if auto-assignment is enabled for the organization."""
        # For now, return True. In production, check org settings.
        return True

    def get_assignment_strategy(self) -> AssignmentStrategy:
        """Get the configured assignment strategy for the organization."""
        # For now, return BEST_FIT. In production, check org settings.
        return AssignmentStrategy.BEST_FIT

    def on_new_lead(self, lead: models.Lead) -> Optional[models.Salesperson]:
        """
        Trigger automation when a new lead is created.
        Returns the assigned salesperson if auto-assignment is enabled.
        """
        if not self.should_auto_assign():
            return None

        if lead.assigned_user_id is not None:
            return None  # Already assigned

        strategy = self.get_assignment_strategy()
        assignment_service = LeadAssignmentService(self.db, self.org_id)
        return assignment_service.assign_lead(lead, strategy)


def get_assignment_preview(
    db: Session,
    org_id: int,
    strategy: AssignmentStrategy,
) -> list[dict]:
    """
    Get a preview of how leads would be distributed with the given strategy.
    Returns distribution stats for each salesperson.
    """
    service = LeadAssignmentService(db, org_id)
    salespeople = service.get_active_salespeople()

    preview = []
    for sp in salespeople:
        workload = service.get_salesperson_workload(sp.user_id)
        close_rate = service.get_salesperson_close_rate(sp.user_id)

        # Estimate assignment percentage based on strategy
        if strategy == AssignmentStrategy.ROUND_ROBIN:
            estimated_pct = 100 / len(salespeople) if salespeople else 0
        elif strategy == AssignmentStrategy.LOWEST_WORKLOAD:
            # Would need more complex calculation
            estimated_pct = 100 / len(salespeople) if salespeople else 0
        elif strategy == AssignmentStrategy.WEIGHTED_PERFORMANCE:
            total_rate = sum(max(service.get_salesperson_close_rate(s.user_id), 10) for s in salespeople)
            estimated_pct = max(close_rate, 10) / total_rate * 100 if total_rate > 0 else 0
        else:  # BEST_FIT
            estimated_pct = 100 / len(salespeople) if salespeople else 0

        preview.append({
            "user_id": sp.user_id,
            "display_name": sp.display_name,
            "current_workload": workload,
            "close_rate": round(close_rate, 1),
            "estimated_assignment_pct": round(estimated_pct, 1),
        })

    return preview
