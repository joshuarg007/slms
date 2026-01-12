# app/api/routes/paypal.py
"""
PayPal Billing Routes

Handles PayPal subscription creation, capture, cancellation, and webhooks.
Works alongside Stripe as an alternative payment method.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plans import get_plan_limits
from app.db.session import SessionLocal
from app.db import models
from app.api.routes.auth import get_current_user
from app.services import paypal as paypal_service
from app.services.paypal import PayPalError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["PayPal Billing"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _success_url(subscription_id: str = ""):
    """Return URL for successful PayPal subscription."""
    base = f"{settings.frontend_base_url}/app/billing?status=success&provider=paypal"
    if subscription_id:
        base += f"&subscription_id={subscription_id}"
    return base


def _cancel_url():
    """Return URL for cancelled PayPal checkout."""
    return f"{settings.frontend_base_url}/app/billing?status=cancel&provider=paypal"


class PayPalSubscriptionRequest(BaseModel):
    plan: str = "pro"  # starter, pro
    billing_cycle: str = "monthly"  # monthly, annual


class PayPalCaptureRequest(BaseModel):
    subscription_id: str


@router.post("/paypal/create-subscription")
def create_paypal_subscription(
    req: PayPalSubscriptionRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Create a PayPal subscription and return the approval URL.

    The user will be redirected to PayPal to approve the subscription,
    then back to our app where we'll call /paypal/capture to activate it.
    """
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    # Validate plan
    if req.plan not in ("starter", "pro"):
        raise HTTPException(400, f"Invalid plan: {req.plan}. Must be 'starter' or 'pro'")

    if req.billing_cycle not in ("monthly", "annual"):
        raise HTTPException(400, f"Invalid billing cycle: {req.billing_cycle}")

    # Check for existing active subscription (any provider)
    blocking_statuses = {"active", "past_due", "trialing", "canceling"}
    has_stripe_sub = org.stripe_subscription_id and org.subscription_status in blocking_statuses
    has_paypal_sub = org.paypal_subscription_id and org.subscription_status in blocking_statuses

    if has_stripe_sub or has_paypal_sub:
        provider = "Stripe" if has_stripe_sub else "PayPal"
        raise HTTPException(
            400,
            f"You already have an active subscription via {provider}. "
            "Please cancel it first before switching payment methods."
        )

    # Check for AppSumo lifetime plan
    if org.plan == "appsumo" and org.plan_source == "appsumo":
        raise HTTPException(
            400,
            "You have a lifetime AppSumo plan. No additional subscription needed."
        )

    # Create PayPal subscription
    try:
        result = paypal_service.create_subscription(
            plan=req.plan,
            billing_cycle=req.billing_cycle,
            return_url=_success_url(),
            cancel_url=_cancel_url(),
            org_id=org.id,
        )

        logger.info(
            f"Created PayPal subscription {result['subscription_id']} "
            f"for org {org.id} ({req.plan}/{req.billing_cycle})"
        )

        return {
            "subscription_id": result["subscription_id"],
            "approval_url": result["approval_url"],
            "status": result["status"],
        }

    except PayPalError as e:
        logger.error(f"PayPal subscription creation failed: {e.message} - {e.details}")
        raise HTTPException(500, f"Failed to create PayPal subscription: {e.message}")


@router.post("/paypal/capture")
def capture_paypal_subscription(
    req: PayPalCaptureRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Capture/activate a PayPal subscription after user approval.

    Called after user returns from PayPal approval flow.
    Verifies the subscription is ACTIVE and updates the organization.
    """
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    try:
        # Get subscription details from PayPal
        subscription = paypal_service.get_subscription_details(req.subscription_id)

        # Verify subscription is active
        if subscription.status != "ACTIVE":
            logger.warning(
                f"PayPal subscription {req.subscription_id} not active: {subscription.status}"
            )
            raise HTTPException(
                400,
                f"Subscription is not active. Status: {subscription.status}"
            )

        # Get plan details from the subscription
        plan, billing_cycle = paypal_service.get_plan_from_id(subscription.plan_id)

        if plan == "unknown":
            logger.error(f"Unknown PayPal plan ID: {subscription.plan_id}")
            raise HTTPException(500, "Unable to determine subscription plan")

        # Cancel any existing Stripe subscription if present
        if org.stripe_subscription_id:
            try:
                import stripe
                stripe.api_key = settings.stripe_secret_key
                stripe.Subscription.cancel(org.stripe_subscription_id)
                logger.info(f"Cancelled Stripe subscription {org.stripe_subscription_id} for org {org.id}")
            except Exception as e:
                logger.warning(f"Failed to cancel Stripe subscription: {e}")
            org.stripe_subscription_id = None

        # Update organization with PayPal subscription
        org.paypal_subscription_id = subscription.id
        org.plan = plan
        org.plan_source = "paypal"
        org.billing_cycle = billing_cycle
        org.subscription_status = "active"

        # Parse next billing time if available
        if subscription.next_billing_time:
            try:
                # PayPal returns ISO 8601 format
                org.current_period_end = datetime.fromisoformat(
                    subscription.next_billing_time.replace("Z", "+00:00")
                )
            except ValueError:
                pass

        # Clear trial if active
        if org.trial_ends_at:
            org.trial_ends_at = None
            org.trial_started_at = None

        db.add(org)
        db.commit()

        logger.info(
            f"Activated PayPal subscription {subscription.id} for org {org.id}: "
            f"{plan}/{billing_cycle}"
        )

        return {
            "success": True,
            "subscription_id": subscription.id,
            "plan": plan,
            "billing_cycle": billing_cycle,
            "status": "active",
        }

    except PayPalError as e:
        logger.error(f"PayPal capture failed: {e.message} - {e.details}")
        raise HTTPException(500, f"Failed to capture subscription: {e.message}")


@router.post("/paypal/cancel")
def cancel_paypal_subscription(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Cancel the current PayPal subscription.

    The subscription will be cancelled immediately with PayPal.
    User will retain access until the end of the current billing period.
    """
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    if not org.paypal_subscription_id:
        raise HTTPException(400, "No active PayPal subscription found")

    if org.plan_source != "paypal":
        raise HTTPException(
            400,
            "Your subscription is not managed by PayPal. "
            "Please use the Stripe billing portal to cancel."
        )

    try:
        success = paypal_service.cancel_subscription(
            org.paypal_subscription_id,
            reason="User requested cancellation via Site2CRM"
        )

        if not success:
            raise HTTPException(500, "Failed to cancel subscription with PayPal")

        # Update local status
        org.subscription_status = "canceling"
        db.add(org)
        db.commit()

        logger.info(f"Cancelled PayPal subscription for org {org.id}")

        return {
            "success": True,
            "message": "Subscription cancelled. You will retain access until the end of your billing period.",
            "current_period_end": org.current_period_end.isoformat() if org.current_period_end else None,
        }

    except PayPalError as e:
        logger.error(f"PayPal cancellation failed: {e.message}")
        raise HTTPException(500, f"Failed to cancel subscription: {e.message}")


@router.get("/paypal/subscription-status")
def get_paypal_subscription_status(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Get the current PayPal subscription status.

    Queries PayPal directly to get the latest subscription state.
    """
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    if not org.paypal_subscription_id:
        return {
            "has_paypal_subscription": False,
            "plan_source": org.plan_source,
        }

    try:
        subscription = paypal_service.get_subscription_details(org.paypal_subscription_id)

        return {
            "has_paypal_subscription": True,
            "subscription_id": subscription.id,
            "status": subscription.status,
            "plan_id": subscription.plan_id,
            "next_billing_time": subscription.next_billing_time,
            "subscriber_email": subscription.subscriber_email,
        }

    except PayPalError as e:
        logger.error(f"Failed to get PayPal subscription status: {e.message}")
        return {
            "has_paypal_subscription": True,
            "subscription_id": org.paypal_subscription_id,
            "status": "unknown",
            "error": "Unable to fetch details from PayPal",
        }


@router.post("/paypal/webhook")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle PayPal webhook events.

    Processes subscription lifecycle events:
    - BILLING.SUBSCRIPTION.ACTIVATED
    - BILLING.SUBSCRIPTION.CANCELLED
    - BILLING.SUBSCRIPTION.SUSPENDED
    - BILLING.SUBSCRIPTION.EXPIRED
    - PAYMENT.SALE.COMPLETED
    """
    try:
        body = await request.body()
        event = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse PayPal webhook body: {e}")
        return JSONResponse({"status": "error"}, status_code=200)

    event_type = event.get("event_type", "")
    resource = event.get("resource", {})

    logger.info(f"PayPal webhook received: {event_type}")

    # Verify webhook signature (if webhook ID is configured)
    if settings.paypal_webhook_id:
        headers = request.headers
        is_valid = paypal_service.verify_webhook_signature(
            webhook_id=settings.paypal_webhook_id,
            transmission_id=headers.get("paypal-transmission-id", ""),
            transmission_time=headers.get("paypal-transmission-time", ""),
            cert_url=headers.get("paypal-cert-url", ""),
            auth_algo=headers.get("paypal-auth-algo", ""),
            transmission_sig=headers.get("paypal-transmission-sig", ""),
            webhook_event=event,
        )

        if not is_valid:
            logger.warning("PayPal webhook signature verification failed")
            # Still return 200 to prevent retries, but log the issue
            return JSONResponse({"status": "signature_invalid"}, status_code=200)

    # Parse the event
    parsed = paypal_service.parse_webhook_event(event_type, resource)
    org_id = parsed.get("org_id")
    subscription_id = parsed.get("subscription_id")

    if not org_id:
        logger.warning(f"PayPal webhook missing org_id (custom_id): {event_type}")
        return JSONResponse({"status": "ok"}, status_code=200)

    org = db.get(models.Organization, org_id)
    if not org:
        logger.warning(f"PayPal webhook: org {org_id} not found")
        return JSONResponse({"status": "ok"}, status_code=200)

    # Handle different event types
    try:
        if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
            _handle_subscription_activated(db, org, parsed)

        elif event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            _handle_subscription_cancelled(db, org, parsed)

        elif event_type == "BILLING.SUBSCRIPTION.SUSPENDED":
            _handle_subscription_suspended(db, org, parsed)

        elif event_type == "BILLING.SUBSCRIPTION.EXPIRED":
            _handle_subscription_expired(db, org, parsed)

        elif event_type == "PAYMENT.SALE.COMPLETED":
            _handle_payment_completed(db, org, parsed)

        else:
            logger.info(f"Unhandled PayPal webhook event: {event_type}")

    except Exception as e:
        logger.error(f"Error processing PayPal webhook {event_type}: {e}")
        # Return 200 anyway to prevent retries

    return JSONResponse({"status": "ok"}, status_code=200)


def _handle_subscription_activated(db: Session, org: models.Organization, parsed: dict):
    """Handle BILLING.SUBSCRIPTION.ACTIVATED event."""
    plan_id = parsed.get("plan_id", "")
    plan, billing_cycle = paypal_service.get_plan_from_id(plan_id)

    org.paypal_subscription_id = parsed["subscription_id"]
    org.plan = plan if plan != "unknown" else org.plan
    org.plan_source = "paypal"
    org.billing_cycle = billing_cycle if billing_cycle != "unknown" else org.billing_cycle
    org.subscription_status = "active"

    if parsed.get("next_billing_time"):
        try:
            org.current_period_end = datetime.fromisoformat(
                parsed["next_billing_time"].replace("Z", "+00:00")
            )
        except ValueError:
            pass

    db.add(org)
    db.commit()
    logger.info(f"PayPal subscription activated for org {org.id}: {plan}/{billing_cycle}")


def _handle_subscription_cancelled(db: Session, org: models.Organization, parsed: dict):
    """Handle BILLING.SUBSCRIPTION.CANCELLED event."""
    org.subscription_status = "canceled"
    org.paypal_subscription_id = None
    org.plan = "free"
    org.plan_source = "stripe"  # Reset to default

    db.add(org)
    db.commit()
    logger.info(f"PayPal subscription cancelled for org {org.id}")


def _handle_subscription_suspended(db: Session, org: models.Organization, parsed: dict):
    """Handle BILLING.SUBSCRIPTION.SUSPENDED event (payment failed)."""
    org.subscription_status = "past_due"

    db.add(org)
    db.commit()
    logger.info(f"PayPal subscription suspended for org {org.id}")


def _handle_subscription_expired(db: Session, org: models.Organization, parsed: dict):
    """Handle BILLING.SUBSCRIPTION.EXPIRED event."""
    org.subscription_status = "canceled"
    org.paypal_subscription_id = None
    org.plan = "free"
    org.plan_source = "stripe"

    db.add(org)
    db.commit()
    logger.info(f"PayPal subscription expired for org {org.id}")


def _handle_payment_completed(db: Session, org: models.Organization, parsed: dict):
    """Handle PAYMENT.SALE.COMPLETED event (recurring payment succeeded)."""
    # If subscription was past_due, reactivate it
    if org.subscription_status == "past_due":
        org.subscription_status = "active"
        db.add(org)
        db.commit()
        logger.info(f"PayPal payment completed, reactivated org {org.id}")
    else:
        logger.info(f"PayPal payment completed for org {org.id}")
