# app/services/subscription.py
from typing import Optional

# We annotate as a string to avoid circular imports; you can import the model if you prefer.
def org_has_active_subscription(org: Optional["Organization"]) -> bool:
    """
    Returns True when the organization has a live subscription.
    We treat 'active' and 'trialing' as valid.
    """
    if not org:
        return False
    status = (getattr(org, "subscription_status", "") or "").lower()
    sub_id = getattr(org, "stripe_subscription_id", None)
    return bool(sub_id) and status in {"active", "trialing"}
