"""
PayPal API Client Service

Handles all PayPal API interactions for subscriptions.
Uses PayPal REST API v1 for subscriptions and v2 for webhooks.
"""

import base64
import hashlib
import hmac
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from app.core.config import settings

logger = logging.getLogger(__name__)

# PayPal API endpoints
SANDBOX_BASE = "https://api-m.sandbox.paypal.com"
LIVE_BASE = "https://api-m.paypal.com"

# Token cache (module-level)
_token_cache: dict = {"token": None, "expires_at": 0}


@dataclass
class PayPalSubscription:
    """PayPal subscription details."""
    id: str
    status: str  # APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED
    plan_id: str
    start_time: Optional[str] = None
    next_billing_time: Optional[str] = None
    subscriber_email: Optional[str] = None


def _get_base_url() -> str:
    """Get the appropriate PayPal API base URL."""
    mode = settings.paypal_mode.lower()
    return LIVE_BASE if mode == "live" else SANDBOX_BASE


def _api_request(
    method: str,
    endpoint: str,
    data: Optional[dict] = None,
    access_token: Optional[str] = None,
) -> dict:
    """Make an authenticated API request to PayPal."""
    base_url = _get_base_url()
    url = f"{base_url}{endpoint}"

    headers = {
        "Content-Type": "application/json",
    }

    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    body = json.dumps(data).encode() if data else None

    req = Request(url, data=body, headers=headers, method=method)

    try:
        with urlopen(req, timeout=30) as resp:
            response_body = resp.read().decode()
            return json.loads(response_body) if response_body else {}
    except HTTPError as e:
        error_body = e.read().decode()
        logger.error(f"PayPal API error: {e.code} {error_body}")
        raise PayPalError(f"PayPal API error: {e.code}", error_body)
    except URLError as e:
        logger.error(f"PayPal connection error: {e.reason}")
        raise PayPalError(f"PayPal connection error: {e.reason}")


class PayPalError(Exception):
    """Custom exception for PayPal API errors."""
    def __init__(self, message: str, details: str = ""):
        self.message = message
        self.details = details
        super().__init__(message)


def get_access_token() -> str:
    """
    Get OAuth access token from PayPal.
    Uses module-level caching to avoid repeated auth calls.
    """
    global _token_cache

    # Return cached token if still valid (with 60s buffer)
    if _token_cache["token"] and _token_cache["expires_at"] > time.time() + 60:
        return _token_cache["token"]

    client_id = settings.paypal_client_id
    client_secret = settings.paypal_client_secret

    if not client_id or not client_secret:
        raise PayPalError("PayPal credentials not configured")

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    base_url = _get_base_url()

    req = Request(
        f"{base_url}/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            _token_cache["token"] = data["access_token"]
            # expires_in is in seconds
            _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
            return _token_cache["token"]
    except HTTPError as e:
        error_body = e.read().decode()
        logger.error(f"PayPal auth error: {e.code} {error_body}")
        raise PayPalError("Failed to authenticate with PayPal", error_body)


def get_plan_id(plan: str, billing_cycle: str) -> str:
    """
    Get the PayPal Plan ID for a given plan and billing cycle.

    Args:
        plan: "starter" or "pro"
        billing_cycle: "monthly" or "annual"

    Returns:
        PayPal Plan ID string

    Raises:
        PayPalError if plan/cycle combination not found
    """
    plan_map = {
        ("starter", "monthly"): settings.paypal_plan_starter_monthly,
        ("starter", "annual"): settings.paypal_plan_starter_annual,
        ("pro", "monthly"): settings.paypal_plan_pro_monthly,
        ("pro", "annual"): settings.paypal_plan_pro_annual,
    }

    plan_id = plan_map.get((plan.lower(), billing_cycle.lower()))

    if not plan_id:
        raise PayPalError(f"No PayPal plan configured for {plan}/{billing_cycle}")

    return plan_id


def get_plan_from_id(plan_id: str) -> tuple[str, str]:
    """
    Reverse lookup: get plan and billing_cycle from PayPal Plan ID.

    Returns:
        Tuple of (plan, billing_cycle)
    """
    id_map = {
        settings.paypal_plan_starter_monthly: ("starter", "monthly"),
        settings.paypal_plan_starter_annual: ("starter", "annual"),
        settings.paypal_plan_pro_monthly: ("pro", "monthly"),
        settings.paypal_plan_pro_annual: ("pro", "annual"),
    }

    result = id_map.get(plan_id)
    if not result:
        logger.warning(f"Unknown PayPal plan ID: {plan_id}")
        return ("unknown", "unknown")
    return result


def create_subscription(
    plan: str,
    billing_cycle: str,
    return_url: str,
    cancel_url: str,
    org_id: int,
) -> dict:
    """
    Create a PayPal subscription.

    Args:
        plan: "starter" or "pro"
        billing_cycle: "monthly" or "annual"
        return_url: URL to redirect after approval
        cancel_url: URL to redirect if user cancels
        org_id: Organization ID for tracking

    Returns:
        Dict with 'subscription_id' and 'approval_url'
    """
    access_token = get_access_token()
    plan_id = get_plan_id(plan, billing_cycle)

    subscription_data = {
        "plan_id": plan_id,
        "custom_id": str(org_id),  # Track which org this is for
        "application_context": {
            "brand_name": "Site2CRM",
            "locale": "en-US",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
            "return_url": return_url,
            "cancel_url": cancel_url,
        },
    }

    response = _api_request(
        "POST",
        "/v1/billing/subscriptions",
        data=subscription_data,
        access_token=access_token,
    )

    # Find approval URL from links
    approval_url = None
    for link in response.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link.get("href")
            break

    if not approval_url:
        raise PayPalError("No approval URL in PayPal response")

    return {
        "subscription_id": response["id"],
        "approval_url": approval_url,
        "status": response.get("status", "APPROVAL_PENDING"),
    }


def get_subscription_details(subscription_id: str) -> PayPalSubscription:
    """
    Get details of a PayPal subscription.

    Args:
        subscription_id: PayPal subscription ID

    Returns:
        PayPalSubscription object with subscription details
    """
    access_token = get_access_token()

    response = _api_request(
        "GET",
        f"/v1/billing/subscriptions/{subscription_id}",
        access_token=access_token,
    )

    subscriber = response.get("subscriber", {})

    return PayPalSubscription(
        id=response["id"],
        status=response["status"],
        plan_id=response.get("plan_id", ""),
        start_time=response.get("start_time"),
        next_billing_time=response.get("billing_info", {}).get("next_billing_time"),
        subscriber_email=subscriber.get("email_address"),
    )


def activate_subscription(subscription_id: str) -> bool:
    """
    Activate a suspended subscription.
    Note: This is typically handled automatically by PayPal.
    """
    access_token = get_access_token()

    try:
        _api_request(
            "POST",
            f"/v1/billing/subscriptions/{subscription_id}/activate",
            data={"reason": "Reactivating subscription"},
            access_token=access_token,
        )
        return True
    except PayPalError as e:
        logger.error(f"Failed to activate subscription {subscription_id}: {e}")
        return False


def cancel_subscription(subscription_id: str, reason: str = "User requested cancellation") -> bool:
    """
    Cancel a PayPal subscription.

    Args:
        subscription_id: PayPal subscription ID
        reason: Cancellation reason

    Returns:
        True if successful, False otherwise
    """
    access_token = get_access_token()

    try:
        _api_request(
            "POST",
            f"/v1/billing/subscriptions/{subscription_id}/cancel",
            data={"reason": reason},
            access_token=access_token,
        )
        logger.info(f"Cancelled PayPal subscription {subscription_id}")
        return True
    except PayPalError as e:
        logger.error(f"Failed to cancel subscription {subscription_id}: {e}")
        return False


def suspend_subscription(subscription_id: str, reason: str = "Payment failed") -> bool:
    """
    Suspend a PayPal subscription (pause billing).
    """
    access_token = get_access_token()

    try:
        _api_request(
            "POST",
            f"/v1/billing/subscriptions/{subscription_id}/suspend",
            data={"reason": reason},
            access_token=access_token,
        )
        return True
    except PayPalError as e:
        logger.error(f"Failed to suspend subscription {subscription_id}: {e}")
        return False


def verify_webhook_signature(
    webhook_id: str,
    transmission_id: str,
    transmission_time: str,
    cert_url: str,
    auth_algo: str,
    transmission_sig: str,
    webhook_event: dict,
) -> bool:
    """
    Verify PayPal webhook signature.

    PayPal webhooks include signature headers that should be verified
    to ensure the webhook came from PayPal.

    Args:
        webhook_id: Your webhook ID from PayPal Developer Dashboard
        transmission_id: PAYPAL-TRANSMISSION-ID header
        transmission_time: PAYPAL-TRANSMISSION-TIME header
        cert_url: PAYPAL-CERT-URL header
        auth_algo: PAYPAL-AUTH-ALGO header
        transmission_sig: PAYPAL-TRANSMISSION-SIG header
        webhook_event: The webhook body as dict

    Returns:
        True if signature is valid, False otherwise
    """
    access_token = get_access_token()

    verify_data = {
        "auth_algo": auth_algo,
        "cert_url": cert_url,
        "transmission_id": transmission_id,
        "transmission_sig": transmission_sig,
        "transmission_time": transmission_time,
        "webhook_id": webhook_id,
        "webhook_event": webhook_event,
    }

    try:
        response = _api_request(
            "POST",
            "/v1/notifications/verify-webhook-signature",
            data=verify_data,
            access_token=access_token,
        )
        return response.get("verification_status") == "SUCCESS"
    except PayPalError as e:
        logger.error(f"Webhook signature verification failed: {e}")
        return False


def parse_webhook_event(event_type: str, resource: dict) -> dict:
    """
    Parse relevant data from a PayPal webhook event.

    Args:
        event_type: The webhook event type (e.g., BILLING.SUBSCRIPTION.ACTIVATED)
        resource: The resource object from the webhook

    Returns:
        Dict with extracted subscription data
    """
    subscription_id = resource.get("id", "")
    custom_id = resource.get("custom_id", "")  # Our org_id
    status = resource.get("status", "")
    plan_id = resource.get("plan_id", "")

    # Map PayPal status to our status
    status_map = {
        "APPROVAL_PENDING": "inactive",
        "APPROVED": "inactive",
        "ACTIVE": "active",
        "SUSPENDED": "past_due",
        "CANCELLED": "canceled",
        "EXPIRED": "canceled",
    }

    billing_info = resource.get("billing_info", {})
    next_billing = billing_info.get("next_billing_time")

    return {
        "subscription_id": subscription_id,
        "org_id": int(custom_id) if custom_id.isdigit() else None,
        "paypal_status": status,
        "our_status": status_map.get(status, "inactive"),
        "plan_id": plan_id,
        "next_billing_time": next_billing,
    }
