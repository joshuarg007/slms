# app/api/routes/billing.py
from datetime import datetime
import stripe

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.db import models
from app.api.routes.auth import get_current_user  # reuse auth dependency (no main import)

router = APIRouter(tags=["Billing"])

stripe.api_key = settings.stripe_secret_key


# Local DB dependency to avoid importing from main (prevents circular imports)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _success_url():
    return f"{settings.frontend_base_url}/billing?status=success"


def _cancel_url():
    return f"{settings.frontend_base_url}/billing?status=cancel"


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


@router.post("/billing/checkout")
def create_checkout_session(
    request: Request,
    plan: str = "pro",
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    org = db.query(models.Organization).get(user.organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    price_id = settings.stripe_price_id_pro if plan == "pro" else settings.stripe_price_id_pro
    if not price_id:
        raise HTTPException(500, "Stripe price not configured")

    customer_id = _get_or_create_customer(db, org, user.email)

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        client_reference_id=str(org.id),
        success_url=_success_url(),
        cancel_url=_cancel_url(),
        allow_promotion_codes=True,
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={"metadata": {"org_id": str(org.id)}},
    )
    return {"url": session.url}


@router.post("/billing/portal")
def create_portal_session(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    org = db.query(models.Organization).get(user.organization_id)
    if not org or not org.stripe_customer_id:
        raise HTTPException(400, "No Stripe customer for this org")
    ps = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=f"{settings.frontend_base_url}/billing",
    )
    return {"url": ps.url}


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

    # Best-effort updates; never fail webhook delivery
    try:
        if t == "checkout.session.completed":
            org_id = data.get("client_reference_id")
            sub_id = data.get("subscription")
            if org_id and sub_id:
                org = db.query(models.Organization).get(int(org_id))
                if org:
                    org.stripe_subscription_id = sub_id
                    org.subscription_status = "active"
                    org.plan = "pro"
                    db.add(org)
                    db.commit()

        elif t in ("customer.subscription.created", "customer.subscription.updated"):
            sub_id = data.get("id")
            status = data.get("status")
            current_period_end = data.get("current_period_end")
            org_id = (data.get("metadata") or {}).get("org_id")

            if not org_id:
                cust_id = data.get("customer")
                org = db.query(models.Organization).filter(
                    models.Organization.stripe_customer_id == cust_id
                ).first()
            else:
                org = db.query(models.Organization).get(int(org_id))

            if org and sub_id:
                org.stripe_subscription_id = sub_id
                org.subscription_status = status or "active"
                if current_period_end:
                    org.current_period_end = datetime.utcfromtimestamp(current_period_end)
                db.add(org)
                db.commit()

        elif t == "customer.subscription.deleted":
            cust_id = data.get("customer")
            org = db.query(models.Organization).filter(
                models.Organization.stripe_customer_id == cust_id
            ).first()
            if org:
                org.subscription_status = "canceled"
                db.add(org)
                db.commit()
    except Exception:
        pass

    return JSONResponse({"ok": True})
