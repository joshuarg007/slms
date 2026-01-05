# app/api/routes/billing.py
from datetime import datetime, timedelta
import hashlib
import stripe

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plans import PLAN_LIMITS, TRIAL_DURATION_DAYS, get_plan_limits
from app.db.session import SessionLocal
from app.db import models
from app.api.routes.auth import get_current_user

# Track recent checkout sessions to prevent duplicates (in-memory, resets on server restart)
# Key: "org_id:plan:cycle", Value: (checkout_url, timestamp)
_recent_checkouts: dict[str, tuple[str, datetime]] = {}

router = APIRouter(tags=["Billing"])

stripe.api_key = settings.stripe_secret_key


# Price ID mapping
PRICE_IDS = {
    "starter_monthly": settings.stripe_price_starter_monthly,
    "starter_annual": settings.stripe_price_starter_annual,
    "pro_monthly": settings.stripe_price_pro_monthly,
    "pro_annual": settings.stripe_price_pro_annual,
    "pro_ai_monthly": settings.stripe_price_pro_ai_monthly,
    "pro_ai_annual": settings.stripe_price_pro_ai_annual,
}

# Reverse mapping: price_id -> (plan, cycle)
def get_plan_from_price(price_id: str) -> tuple[str, str]:
    """Get (plan, billing_cycle) from Stripe price ID."""
    for key, pid in PRICE_IDS.items():
        if pid == price_id:
            plan, cycle = key.rsplit("_", 1)
            return plan, cycle
    return "pro", "monthly"  # fallback


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _success_url():
    return f"{settings.frontend_base_url}/app/billing?status=success"


def _cancel_url():
    return f"{settings.frontend_base_url}/app/billing?status=cancel"


def _get_or_create_customer(db: Session, org: models.Organization, email: str) -> str:
    if org.stripe_customer_id:
        return org.stripe_customer_id
    cust = stripe.Customer.create(
        email=email,
        metadata={"org_id": str(org.id)},
    )
    org.stripe_customer_id = cust.id
    db.add(org)
    db.commit()
    return cust.id


class CheckoutRequest(BaseModel):
    plan: str = "pro"  # starter, pro, pro_ai
    billing_cycle: str = "monthly"  # monthly, annual


@router.post("/billing/checkout")
def create_checkout_session(
    req: CheckoutRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    # SAFEGUARD 1: Check if already has any active/pending subscription for same plan
    # Block: active, past_due, incomplete, trialing, canceling (still valid until period end)
    # Allow: canceled, inactive, None
    blocking_statuses = {"active", "past_due", "incomplete", "trialing", "canceling"}
    if (org.subscription_status in blocking_statuses and
        org.plan == req.plan and
        org.stripe_subscription_id):
        status_msg = {
            "active": "an active",
            "past_due": "a past-due",
            "incomplete": "a pending",
            "trialing": "a trial",
            "canceling": "a subscription (active until period end) for",
        }.get(org.subscription_status, "a")
        raise HTTPException(
            400,
            f"You already have {status_msg} {req.plan} subscription. "
            "Please resolve or cancel it before subscribing again."
        )

    # SAFEGUARD 2: Check for recent checkout session (within 2 minutes)
    # This prevents rapid double-clicks from creating multiple checkouts
    cache_key = f"{org.id}:{req.plan}:{req.billing_cycle}"
    if cache_key in _recent_checkouts:
        cached_url, cached_time = _recent_checkouts[cache_key]
        if datetime.utcnow() - cached_time < timedelta(minutes=2):
            # Return existing checkout URL instead of creating new one
            return {"url": cached_url}

    # Get the right price ID
    price_key = f"{req.plan}_{req.billing_cycle}"
    price_id = PRICE_IDS.get(price_key)

    if not price_id:
        raise HTTPException(400, f"Invalid plan/cycle: {req.plan}/{req.billing_cycle}")

    customer_id = _get_or_create_customer(db, org, user.email)

    # Cancel existing subscription if switching plans (different plan, not same plan)
    if org.stripe_subscription_id and org.subscription_status == "active" and org.plan != req.plan:
        try:
            stripe.Subscription.cancel(org.stripe_subscription_id)
            org.stripe_subscription_id = None
            db.commit()
        except stripe.error.StripeError:
            pass  # Continue even if cancel fails

    # SAFEGUARD 3: Use idempotency key to prevent duplicate Stripe sessions
    # Key based on org_id + plan + cycle + 15-minute time bucket
    # 15 min reduces boundary collision risk vs 5 min, while still allowing re-attempts after reasonable wait
    time_bucket = int(datetime.utcnow().timestamp() // 900)  # 15-minute buckets
    idempotency_key = hashlib.sha256(
        f"{org.id}:{req.plan}:{req.billing_cycle}:{time_bucket}".encode()
    ).hexdigest()[:32]

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            client_reference_id=str(org.id),
            success_url=_success_url(),
            cancel_url=_cancel_url(),
            allow_promotion_codes=True,
            line_items=[{"price": price_id, "quantity": 1}],
            subscription_data={
                "metadata": {"org_id": str(org.id), "plan": req.plan, "billing_cycle": req.billing_cycle}
            },
            idempotency_key=idempotency_key,
        )
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Unable to create checkout session: {str(e)}")

    # Cache the checkout URL to prevent duplicates
    _recent_checkouts[cache_key] = (session.url, datetime.utcnow())

    # Clean up old cache entries (older than 10 minutes)
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    stale_keys = [k for k, (_, t) in _recent_checkouts.items() if t < cutoff]
    for k in stale_keys:
        del _recent_checkouts[k]

    return {"url": session.url}


@router.post("/billing/portal")
def create_portal_session(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    org = db.get(models.Organization, user.organization_id)
    if not org or not org.stripe_customer_id:
        raise HTTPException(400, "No Stripe customer for this org")
    ps = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=f"{settings.frontend_base_url}/app/billing",
    )
    return {"url": ps.url}


@router.get("/billing/subscription")
def get_subscription_status(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get current subscription status and usage."""
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    limits = get_plan_limits(org.plan)

    # Check if trial expired
    is_trial_active = False
    trial_days_remaining = 0
    if org.plan == "trial" and org.trial_ends_at:
        if org.trial_ends_at > datetime.utcnow():
            is_trial_active = True
            trial_days_remaining = (org.trial_ends_at - datetime.utcnow()).days
        else:
            # Trial expired, revert to free
            org.plan = "free"
            org.subscription_status = "inactive"
            db.commit()
            limits = get_plan_limits("free")

    # Calculate AI messages remaining
    ai_limit = limits.ai_messages_per_month
    ai_remaining = -1 if ai_limit == -1 else max(0, ai_limit - org.ai_messages_this_month) if ai_limit > 0 else 0

    return {
        "plan": org.plan,
        "billing_cycle": org.billing_cycle,
        "subscription_status": org.subscription_status,
        "current_period_end": org.current_period_end.isoformat() if org.current_period_end else None,
        "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
        "is_trial_active": is_trial_active,
        "trial_days_remaining": trial_days_remaining,
        "usage": {
            "leads_this_month": org.leads_this_month,
            "leads_limit": limits.leads_per_month,
            "leads_remaining": max(0, limits.leads_per_month - org.leads_this_month) if limits.leads_per_month > 0 else -1,
            "ai_messages_this_month": org.ai_messages_this_month,
            "ai_messages_limit": ai_limit,
            "ai_messages_remaining": ai_remaining,
        },
        "limits": {
            "leads_per_month": limits.leads_per_month,
            "forms": limits.forms,
            "crm_integrations": limits.crm_integrations,
            "ai_messages_per_month": ai_limit,
            "ai_features": limits.ai_features,
            "remove_branding": limits.remove_branding,
            "priority_support": limits.priority_support,
        },
    }


@router.post("/billing/start-trial")
def start_trial(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Start a 14-day free trial."""
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    # Check if already used trial or has active subscription
    if org.trial_ends_at is not None:
        raise HTTPException(400, "Trial already used")
    if org.subscription_status == "active":
        raise HTTPException(400, "Already have active subscription")

    org.plan = "trial"
    org.subscription_status = "trialing"
    org.trial_ends_at = datetime.utcnow() + timedelta(days=TRIAL_DURATION_DAYS)
    db.commit()

    return {
        "message": f"Trial started! You have {TRIAL_DURATION_DAYS} days to try all features.",
        "trial_ends_at": org.trial_ends_at.isoformat(),
    }


@router.post("/billing/setup-intent")
def create_setup_intent(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Create a SetupIntent for updating payment method."""
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    customer_id = _get_or_create_customer(db, org, user.email)

    try:
        setup_intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=["card"],
        )
        return {
            "client_secret": setup_intent.client_secret,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Failed to create setup intent: {str(e)}")


@router.post("/billing/payment-method")
def update_payment_method(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Set the most recent payment method as default for subscription."""
    org = db.get(models.Organization, user.organization_id)
    if not org or not org.stripe_customer_id:
        raise HTTPException(400, "No Stripe customer found")

    try:
        # Get the customer's payment methods
        payment_methods = stripe.PaymentMethod.list(
            customer=org.stripe_customer_id,
            type="card",
            limit=1,
        )

        if not payment_methods.data:
            raise HTTPException(400, "No payment method found")

        pm_id = payment_methods.data[0].id

        # Set as default for invoices
        stripe.Customer.modify(
            org.stripe_customer_id,
            invoice_settings={"default_payment_method": pm_id},
        )

        # Update subscription if exists
        if org.stripe_subscription_id:
            stripe.Subscription.modify(
                org.stripe_subscription_id,
                default_payment_method=pm_id,
            )

        return {"message": "Payment method updated successfully"}
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Failed to update payment method: {str(e)}")


@router.get("/billing/payment-method")
def get_payment_method(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get the current default payment method."""
    org = db.get(models.Organization, user.organization_id)
    if not org or not org.stripe_customer_id:
        return {"payment_method": None}

    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=org.stripe_customer_id,
            type="card",
            limit=1,
        )

        if not payment_methods.data:
            return {"payment_method": None}

        pm = payment_methods.data[0]
        return {
            "payment_method": {
                "brand": pm.card.brand,
                "last4": pm.card.last4,
                "exp_month": pm.card.exp_month,
                "exp_year": pm.card.exp_year,
            }
        }
    except stripe.error.StripeError:
        return {"payment_method": None}


@router.get("/billing/invoices")
def get_invoices(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get list of invoices for the organization."""
    org = db.get(models.Organization, user.organization_id)
    if not org or not org.stripe_customer_id:
        return {"invoices": []}

    try:
        invoices = stripe.Invoice.list(
            customer=org.stripe_customer_id,
            limit=12,
        )

        return {
            "invoices": [
                {
                    "id": inv.id,
                    "number": inv.number,
                    "amount_due": inv.amount_due,
                    "amount_paid": inv.amount_paid,
                    "currency": inv.currency,
                    "status": inv.status,
                    "created": inv.created,
                    "hosted_invoice_url": inv.hosted_invoice_url,
                    "invoice_pdf": inv.invoice_pdf,
                }
                for inv in invoices.data
            ]
        }
    except stripe.error.StripeError:
        return {"invoices": []}


@router.post("/billing/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Cancel the current subscription at period end."""
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    if not org.stripe_subscription_id:
        raise HTTPException(400, "No active subscription to cancel")

    try:
        # Cancel at period end (user keeps access until then)
        stripe.Subscription.modify(
            org.stripe_subscription_id,
            cancel_at_period_end=True,
        )
        org.subscription_status = "canceling"
        db.commit()

        return {
            "message": "Subscription will be canceled at the end of the billing period",
            "current_period_end": org.current_period_end.isoformat() if org.current_period_end else None,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Failed to cancel subscription: {str(e)}")


@router.post("/billing/cancel-immediate")
def cancel_subscription_immediate(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Cancel the current subscription immediately."""
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    if not org.stripe_subscription_id:
        raise HTTPException(400, "No active subscription to cancel")

    try:
        stripe.Subscription.cancel(org.stripe_subscription_id)
        org.subscription_status = "canceled"
        org.plan = "free"
        org.stripe_subscription_id = None
        db.commit()

        return {"message": "Subscription canceled immediately"}
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Failed to cancel subscription: {str(e)}")


@router.post("/billing/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    if not sig:
        raise HTTPException(400, "Missing signature")
    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig, secret=settings.stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(400, f"Invalid payload: {e}")

    t = event["type"]
    data = event["data"]["object"]

    try:
        if t == "checkout.session.completed":
            org_id = data.get("client_reference_id")
            sub_id = data.get("subscription")
            if org_id and sub_id:
                org = db.get(models.Organization, int(org_id))
                if org:
                    # Get subscription details for plan info
                    sub = stripe.Subscription.retrieve(sub_id)
                    price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None
                    plan, cycle = get_plan_from_price(price_id) if price_id else ("pro", "monthly")

                    org.stripe_subscription_id = sub_id
                    org.subscription_status = "active"
                    org.plan = plan
                    org.billing_cycle = cycle
                    db.commit()

        elif t in ("customer.subscription.created", "customer.subscription.updated"):
            sub_id = data.get("id")
            status = data.get("status")
            current_period_end = data.get("current_period_end")
            price_id = data["items"]["data"][0]["price"]["id"] if data.get("items", {}).get("data") else None
            org_id = (data.get("metadata") or {}).get("org_id")

            if not org_id:
                cust_id = data.get("customer")
                org = db.query(models.Organization).filter(
                    models.Organization.stripe_customer_id == cust_id
                ).first()
            else:
                org = db.get(models.Organization, int(org_id))

            if org and sub_id:
                plan, cycle = get_plan_from_price(price_id) if price_id else ("pro", "monthly")
                org.stripe_subscription_id = sub_id
                org.subscription_status = status or "active"
                org.plan = plan
                org.billing_cycle = cycle
                if current_period_end:
                    org.current_period_end = datetime.utcfromtimestamp(current_period_end)
                db.commit()

        elif t == "customer.subscription.deleted":
            cust_id = data.get("customer")
            org = db.query(models.Organization).filter(
                models.Organization.stripe_customer_id == cust_id
            ).first()
            if org:
                org.subscription_status = "canceled"
                org.plan = "free"
                db.commit()

        elif t == "invoice.payment_failed":
            cust_id = data.get("customer")
            org = db.query(models.Organization).filter(
                models.Organization.stripe_customer_id == cust_id
            ).first()
            if org:
                org.subscription_status = "past_due"
                db.commit()

    except Exception:
        pass

    return JSONResponse({"ok": True})
