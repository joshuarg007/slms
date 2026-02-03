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
    # Site2CRM AI Chat Widget limits
    chat_agents: int = 0  # Number of chat widget agents allowed (0 = disabled)
    chat_conversations_per_month: int = 0  # -1 = unlimited, 0 = disabled
    chat_pro_features: bool = False  # Access to templates, branding, goals, etc.
    # Token limits for AI chat (prevents abuse)
    max_tokens_per_message: int = 0  # Max tokens in a single user message (0 = disabled)
    max_conversation_turns: int = 0  # Max back-and-forth exchanges per conversation
    max_system_prompt_tokens: int = 0  # Max tokens for business description/context
    # Feature flags
    analytics_enabled: bool = True  # Access to analytics dashboards
    ab_testing_enabled: bool = False  # A/B testing for forms
    form_styles: int = 1  # Number of form styles allowed (-1 = unlimited)


# AI feature definitions
AI_FEATURE_ANALYSIS = "analysis"      # Lead analysis and insights
AI_FEATURE_COACHING = "coaching"      # Sales coaching and tips
AI_FEATURE_REPORTS = "reports"        # AI-generated reports
AI_FEATURE_CUSTOM = "custom"          # Custom prompts (enterprise)

# Plan limit definitions
PLAN_LIMITS: Dict[str, PlanLimits] = {
    # Free tier - limited, no AI, analytics grayed out
    "free": PlanLimits(
        leads_per_month=100,
        forms=1,
        crm_integrations=1,
        ai_messages_per_month=0,
        ai_features=[],
        remove_branding=False,
        priority_support=False,
        chat_agents=0,
        chat_conversations_per_month=0,
        chat_pro_features=False,
        max_tokens_per_message=0,
        max_conversation_turns=0,
        max_system_prompt_tokens=0,
        analytics_enabled=False,  # Analytics grayed out
        ab_testing_enabled=False,
        form_styles=1,
    ),
    # Trial - full Pro access for 14 days
    "trial": PlanLimits(
        leads_per_month=500,
        forms=-1,
        crm_integrations=-1,
        ai_messages_per_month=100,
        ai_features=[AI_FEATURE_ANALYSIS, AI_FEATURE_COACHING],
        remove_branding=True,
        priority_support=False,
        chat_agents=3,
        chat_conversations_per_month=500,
        chat_pro_features=True,
        max_tokens_per_message=1000,
        max_conversation_turns=25,
        max_system_prompt_tokens=1500,
        analytics_enabled=True,
        ab_testing_enabled=True,
        form_styles=-1,
    ),
    # Starter $29/mo - Basic AI, limited tokens
    "starter": PlanLimits(
        leads_per_month=500,
        forms=3,
        crm_integrations=2,
        ai_messages_per_month=50,
        ai_features=[AI_FEATURE_ANALYSIS],
        remove_branding=False,
        priority_support=False,
        chat_agents=1,
        chat_conversations_per_month=500,
        chat_pro_features=False,
        max_tokens_per_message=500,  # ~375 words max per message
        max_conversation_turns=10,
        max_system_prompt_tokens=500,
        analytics_enabled=True,
        ab_testing_enabled=False,
        form_styles=3,
    ),
    # AppSumo lifetime - No AI, generous leads
    "appsumo": PlanLimits(
        leads_per_month=1000,
        forms=2,
        crm_integrations=2,
        ai_messages_per_month=0,  # No AI
        ai_features=[],
        remove_branding=False,
        priority_support=False,
        chat_agents=0,  # No AI chat
        chat_conversations_per_month=0,
        chat_pro_features=False,
        max_tokens_per_message=0,
        max_conversation_turns=0,
        max_system_prompt_tokens=0,
        analytics_enabled=True,
        ab_testing_enabled=False,
        form_styles=2,
    ),
    # Pro $79/mo - Full AI, higher limits
    "pro": PlanLimits(
        leads_per_month=2500,
        forms=-1,
        crm_integrations=-1,
        ai_messages_per_month=200,
        ai_features=[AI_FEATURE_ANALYSIS, AI_FEATURE_COACHING],
        remove_branding=True,
        priority_support=True,
        chat_agents=5,
        chat_conversations_per_month=5000,
        chat_pro_features=True,
        max_tokens_per_message=1000,  # ~750 words max per message
        max_conversation_turns=25,
        max_system_prompt_tokens=1500,
        analytics_enabled=True,
        ab_testing_enabled=True,
        form_styles=-1,
    ),
    # Pro AI (deprecated, maps to Pro)
    "pro_ai": PlanLimits(
        leads_per_month=2500,
        forms=-1,
        crm_integrations=-1,
        ai_messages_per_month=500,
        ai_features=[AI_FEATURE_ANALYSIS, AI_FEATURE_COACHING, AI_FEATURE_REPORTS],
        remove_branding=True,
        priority_support=True,
        chat_agents=10,
        chat_conversations_per_month=10000,
        chat_pro_features=True,
        max_tokens_per_message=1500,
        max_conversation_turns=50,
        max_system_prompt_tokens=2500,
        analytics_enabled=True,
        ab_testing_enabled=True,
        form_styles=-1,
    ),
    # Enterprise - Unlimited everything
    "enterprise": PlanLimits(
        leads_per_month=-1,
        forms=-1,
        crm_integrations=-1,
        ai_messages_per_month=-1,
        ai_features=[AI_FEATURE_ANALYSIS, AI_FEATURE_COACHING, AI_FEATURE_REPORTS, AI_FEATURE_CUSTOM],
        remove_branding=True,
        priority_support=True,
        chat_agents=-1,
        chat_conversations_per_month=-1,
        chat_pro_features=True,
        max_tokens_per_message=2000,  # Still have reasonable per-message limit
        max_conversation_turns=100,
        max_system_prompt_tokens=5000,
        analytics_enabled=True,
        ab_testing_enabled=True,
        form_styles=-1,
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


def get_token_limits(plan: str) -> dict:
    """Get token limits for a plan's AI chat widget."""
    limits = get_plan_limits(plan)
    return {
        "max_tokens_per_message": limits.max_tokens_per_message,
        "max_conversation_turns": limits.max_conversation_turns,
        "max_system_prompt_tokens": limits.max_system_prompt_tokens,
    }


def is_analytics_enabled(plan: str) -> bool:
    """Check if analytics dashboards are enabled for a plan."""
    limits = get_plan_limits(plan)
    return limits.analytics_enabled


def is_ab_testing_enabled(plan: str) -> bool:
    """Check if A/B testing is enabled for a plan."""
    limits = get_plan_limits(plan)
    return limits.ab_testing_enabled


def get_form_styles_limit(plan: str) -> int:
    """Get number of form styles allowed. Returns -1 for unlimited."""
    limits = get_plan_limits(plan)
    return limits.form_styles


def validate_message_tokens(plan: str, token_count: int) -> tuple[bool, str]:
    """
    Validate if a message is within token limits.
    Returns (is_valid, error_message).
    """
    limits = get_plan_limits(plan)
    if limits.max_tokens_per_message == 0:
        return False, "AI chat is not available on your plan. Please upgrade."
    if limits.max_tokens_per_message == -1:
        return True, ""
    if token_count > limits.max_tokens_per_message:
        return False, f"Message too long. Maximum {limits.max_tokens_per_message} tokens allowed on your plan."
    return True, ""


def validate_conversation_turns(plan: str, turn_count: int) -> tuple[bool, str]:
    """
    Validate if conversation is within turn limits.
    Returns (is_valid, error_message).
    """
    limits = get_plan_limits(plan)
    if limits.max_conversation_turns == 0:
        return False, "AI chat is not available on your plan."
    if limits.max_conversation_turns == -1:
        return True, ""
    if turn_count >= limits.max_conversation_turns:
        return False, f"Conversation limit reached ({limits.max_conversation_turns} exchanges). Please start a new chat."
    return True, ""
