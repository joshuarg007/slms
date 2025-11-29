# app/core/plans.py
"""Plan definitions and limits for Site2CRM."""

from dataclasses import dataclass
from typing import Dict

@dataclass
class PlanLimits:
    leads_per_month: int  # -1 = unlimited
    forms: int  # -1 = unlimited
    crm_integrations: int  # -1 = unlimited
    remove_branding: bool
    priority_support: bool


# Plan limit definitions
PLAN_LIMITS: Dict[str, PlanLimits] = {
    "free": PlanLimits(
        leads_per_month=10,
        forms=1,
        crm_integrations=1,
        remove_branding=False,
        priority_support=False,
    ),
    "trial": PlanLimits(
        leads_per_month=100,
        forms=3,
        crm_integrations=4,  # All CRMs during trial
        remove_branding=True,
        priority_support=False,
    ),
    "starter": PlanLimits(
        leads_per_month=100,
        forms=1,
        crm_integrations=1,
        remove_branding=False,
        priority_support=False,
    ),
    "pro": PlanLimits(
        leads_per_month=1000,
        forms=-1,  # Unlimited
        crm_integrations=-1,  # All
        remove_branding=True,
        priority_support=True,
    ),
    "enterprise": PlanLimits(
        leads_per_month=-1,  # Unlimited
        forms=-1,
        crm_integrations=-1,
        remove_branding=True,
        priority_support=True,
    ),
}

# Map Stripe price IDs to plan names (populated at runtime from settings)
PRICE_TO_PLAN: Dict[str, str] = {}

# Trial duration in days
TRIAL_DURATION_DAYS = 14


def get_plan_limits(plan: str) -> PlanLimits:
    """Get limits for a plan, defaulting to free if unknown."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def is_feature_allowed(plan: str, feature: str) -> bool:
    """Check if a feature is allowed for a plan."""
    limits = get_plan_limits(plan)
    if feature == "remove_branding":
        return limits.remove_branding
    if feature == "priority_support":
        return limits.priority_support
    return True
