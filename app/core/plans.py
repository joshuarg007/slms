# app/core/plans.py
"""Plan definitions and limits for Site2CRM."""

from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class PlanLimits:
    leads_per_month: int  # -1 = unlimited
    forms: int  # -1 = unlimited
    crm_integrations: int  # -1 = unlimited
    ai_messages_per_month: int  # -1 = unlimited, 0 = disabled
    ai_features: List[str] = field(default_factory=list)  # ["analysis", "coaching", "reports"]
    remove_branding: bool = False
    priority_support: bool = False


# AI feature definitions
AI_FEATURE_ANALYSIS = "analysis"      # Lead analysis and insights
AI_FEATURE_COACHING = "coaching"      # Sales coaching and tips
AI_FEATURE_REPORTS = "reports"        # AI-generated reports
AI_FEATURE_CUSTOM = "custom"          # Custom prompts (enterprise)

# Plan limit definitions
PLAN_LIMITS: Dict[str, PlanLimits] = {
    "free": PlanLimits(
        leads_per_month=10,
        forms=1,
        crm_integrations=1,
        ai_messages_per_month=0,
        ai_features=[],
        remove_branding=False,
        priority_support=False,
    ),
    "trial": PlanLimits(
        leads_per_month=100,
        forms=3,
        crm_integrations=4,  # All CRMs during trial
        ai_messages_per_month=25,  # Limited AI during trial
        ai_features=[AI_FEATURE_ANALYSIS],
        remove_branding=True,
        priority_support=False,
    ),
    "starter": PlanLimits(
        leads_per_month=100,
        forms=1,
        crm_integrations=1,
        ai_messages_per_month=0,
        ai_features=[],
        remove_branding=False,
        priority_support=False,
    ),
    "pro": PlanLimits(
        leads_per_month=1000,
        forms=-1,  # Unlimited
        crm_integrations=-1,  # All
        ai_messages_per_month=50,
        ai_features=[AI_FEATURE_ANALYSIS],
        remove_branding=True,
        priority_support=True,
    ),
    "pro_ai": PlanLimits(
        leads_per_month=1000,
        forms=-1,
        crm_integrations=-1,
        ai_messages_per_month=500,
        ai_features=[AI_FEATURE_ANALYSIS, AI_FEATURE_COACHING, AI_FEATURE_REPORTS],
        remove_branding=True,
        priority_support=True,
    ),
    "enterprise": PlanLimits(
        leads_per_month=-1,  # Unlimited
        forms=-1,
        crm_integrations=-1,
        ai_messages_per_month=-1,  # Unlimited
        ai_features=[AI_FEATURE_ANALYSIS, AI_FEATURE_COACHING, AI_FEATURE_REPORTS, AI_FEATURE_CUSTOM],
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


def is_ai_enabled(plan: str) -> bool:
    """Check if AI features are enabled for a plan."""
    limits = get_plan_limits(plan)
    return limits.ai_messages_per_month != 0


def is_ai_feature_allowed(plan: str, ai_feature: str) -> bool:
    """Check if a specific AI feature is allowed for a plan."""
    limits = get_plan_limits(plan)
    return ai_feature in limits.ai_features


def get_ai_message_limit(plan: str) -> int:
    """Get AI message limit for a plan. Returns -1 for unlimited, 0 for disabled."""
    limits = get_plan_limits(plan)
    return limits.ai_messages_per_month
