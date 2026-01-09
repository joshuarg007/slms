# app/api/routes/appsumo.py
"""
AppSumo lifetime license redemption and management.

Handles:
- Code redemption with addendum acceptance
- Validation of AppSumo codes
- Audit trail for legal compliance
"""

import logging
import re
import secrets
import string
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.db import models
from app.api.deps.auth import get_db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appsumo", tags=["AppSumo"])

# Current addendum version - update when addendum changes
APPSUMO_ADDENDUM_VERSION = "1.0"


class RedeemCodeRequest(BaseModel):
    """Request to redeem an AppSumo code."""
    code: str
    accept_addendum: bool

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        """Validate and normalize AppSumo code format."""
        # Remove whitespace and normalize
        code = v.strip().upper()

        # Basic format validation (adjust pattern as needed for actual AppSumo codes)
        if not code:
            raise ValueError("Code is required")
        if len(code) < 8 or len(code) > 50:
            raise ValueError("Invalid code format")

        # Only allow alphanumeric and hyphens
        if not re.match(r'^[A-Z0-9\-]+$', code):
            raise ValueError("Invalid code format")

        return code


class RedeemCodeResponse(BaseModel):
    """Response after successful code redemption."""
    success: bool
    message: str
    plan: str
    plan_limits: dict
    addendum_version: str
    accepted_at: str


class AppSumoStatusResponse(BaseModel):
    """Current AppSumo status for an organization."""
    is_appsumo: bool
    code_redeemed: Optional[str] = None
    addendum_accepted: bool
    addendum_version: Optional[str] = None
    accepted_at: Optional[str] = None
    accepted_by_email: Optional[str] = None


def validate_appsumo_code(db: Session, code: str) -> tuple[bool, models.AppSumoCode | None, str]:
    """
    Validate that an AppSumo code exists in the database and is available.

    Returns:
        (is_valid, code_record, error_message)
    """
    code_upper = code.strip().upper()

    # Look up code in database
    code_record = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.code == code_upper
    ).first()

    if not code_record:
        return False, None, "Invalid or unrecognized AppSumo code"

    if code_record.status == models.APPSUMO_CODE_REDEEMED:
        return False, code_record, "This AppSumo code has already been redeemed"

    if code_record.status == models.APPSUMO_CODE_REVOKED:
        return False, code_record, "This AppSumo code has been revoked"

    if code_record.status != models.APPSUMO_CODE_UNUSED:
        return False, code_record, f"Invalid code status: {code_record.status}"

    return True, code_record, ""


@router.post("/redeem", response_model=RedeemCodeResponse)
def redeem_appsumo_code(
    request: RedeemCodeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Redeem an AppSumo lifetime license code.

    Requirements:
    - User must be authenticated
    - User must be OWNER or ADMIN of their organization
    - Addendum must be explicitly accepted
    - Code must be valid and unused
    """
    org = db.get(models.Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check user has authority to redeem
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=403,
            detail="Only organization owners and admins can redeem AppSumo codes"
        )

    # Check if organization already has AppSumo plan
    if org.plan == "appsumo":
        raise HTTPException(
            status_code=400,
            detail="Organization already has an AppSumo lifetime license"
        )

    # Check if organization has an active paid subscription
    if org.subscription_status == "active" and org.plan in ["starter", "pro", "pro_ai", "enterprise"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot redeem AppSumo code while on an active paid subscription. "
                   "Please cancel your subscription first."
        )

    # Require explicit addendum acceptance
    if not request.accept_addendum:
        raise HTTPException(
            status_code=400,
            detail="You must accept the AppSumo Lifetime License Addendum to redeem this code"
        )

    # Validate the code against database
    is_valid, code_record, error_message = validate_appsumo_code(db, request.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)

    # All validations passed - activate the AppSumo plan
    now = datetime.utcnow()

    # Mark the code as redeemed
    code_record.status = models.APPSUMO_CODE_REDEEMED
    code_record.redeemed_at = now
    code_record.redeemed_by_org_id = org.id

    # Update organization
    org.plan = "appsumo"
    org.plan_source = "appsumo"
    org.billing_cycle = "lifetime"
    org.subscription_status = "active"
    org.appsumo_code = code_record.code  # Use normalized code from DB
    org.appsumo_addendum_accepted = True
    org.appsumo_addendum_version = APPSUMO_ADDENDUM_VERSION
    org.appsumo_addendum_accepted_at = now
    org.appsumo_addendum_accepted_by_user_id = current_user.id

    # Clear any Stripe subscription data (shouldn't exist, but be safe)
    org.stripe_subscription_id = None
    org.current_period_end = None

    # Update user audit trail
    current_user.accepted_appsumo_addendum_at = now
    current_user.accepted_appsumo_addendum_version = APPSUMO_ADDENDUM_VERSION

    db.commit()

    logger.info(
        f"AppSumo code redeemed: org={org.id}, user={current_user.id}, "
        f"code={code_record.code[:8]}..., version={APPSUMO_ADDENDUM_VERSION}"
    )

    # Return success with plan details
    from app.core.plans import get_plan_limits
    limits = get_plan_limits("appsumo")

    return RedeemCodeResponse(
        success=True,
        message="AppSumo lifetime license activated successfully",
        plan="appsumo",
        plan_limits={
            "leads_per_month": limits.leads_per_month,
            "forms": limits.forms,
            "crm_integrations": limits.crm_integrations,
            "ai_features": limits.ai_features,
            "remove_branding": limits.remove_branding,
            "priority_support": limits.priority_support,
        },
        addendum_version=APPSUMO_ADDENDUM_VERSION,
        accepted_at=now.isoformat(),
    )


@router.get("/status", response_model=AppSumoStatusResponse)
def get_appsumo_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get AppSumo status for the current organization."""
    org = db.get(models.Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get the user who accepted (if any)
    accepted_by_email = None
    if org.appsumo_addendum_accepted_by_user_id:
        acceptor = db.get(models.User, org.appsumo_addendum_accepted_by_user_id)
        if acceptor:
            accepted_by_email = acceptor.email

    return AppSumoStatusResponse(
        is_appsumo=org.plan == "appsumo",
        code_redeemed=org.appsumo_code[:8] + "..." if org.appsumo_code else None,
        addendum_accepted=org.appsumo_addendum_accepted,
        addendum_version=org.appsumo_addendum_version,
        accepted_at=org.appsumo_addendum_accepted_at.isoformat() if org.appsumo_addendum_accepted_at else None,
        accepted_by_email=accepted_by_email,
    )


@router.get("/addendum")
def get_addendum_text():
    """
    Get the current AppSumo Lifetime License Addendum text.

    This endpoint is public so users can review the addendum before redeeming.
    """
    return {
        "version": APPSUMO_ADDENDUM_VERSION,
        "effective_date": "2026-01-08",
        "url": "https://site2crm.io/legal/appsumo-addendum",
        "summary": {
            "license_type": "Lifetime, non-transferable",
            "leads_per_month": 1500,
            "crm_integrations": 2,
            "forms": 2,
            "ai_features": False,
            "branding_removal": False,
            "priority_support": False,
            "quota_enforcement": "Hard cap - requests rejected at limit",
            "upgrade_path": "None - must forfeit lifetime license to upgrade",
        },
    }


# =============================================================================
# ADMIN ENDPOINTS - Code Management
# =============================================================================

def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Dependency to require admin role."""
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def generate_appsumo_code() -> str:
    """Generate a random AppSumo-style code: XXXXX-XXXXX-XXXXX."""
    chars = string.ascii_uppercase + string.digits
    segments = [
        ''.join(secrets.choice(chars) for _ in range(5))
        for _ in range(3)
    ]
    return '-'.join(segments)


class GenerateCodesRequest(BaseModel):
    """Request to generate new AppSumo codes."""
    count: int
    batch_id: Optional[str] = None

    @field_validator("count")
    @classmethod
    def validate_count(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Count must be at least 1")
        if v > 1000:
            raise ValueError("Cannot generate more than 1000 codes at once")
        return v


class ImportCodesRequest(BaseModel):
    """Request to import existing AppSumo codes."""
    codes: list[str]
    batch_id: Optional[str] = None

    @field_validator("codes")
    @classmethod
    def validate_codes(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("At least one code is required")
        if len(v) > 1000:
            raise ValueError("Cannot import more than 1000 codes at once")
        return [c.strip().upper() for c in v if c.strip()]


class CodeInfo(BaseModel):
    """AppSumo code information."""
    code: str
    status: str
    created_at: str
    redeemed_at: Optional[str] = None
    redeemed_by_org_id: Optional[int] = None
    redeemed_by_org_name: Optional[str] = None
    revoked_at: Optional[str] = None
    revoked_reason: Optional[str] = None
    batch_id: Optional[str] = None


class CodesListResponse(BaseModel):
    """Response for listing codes."""
    codes: list[CodeInfo]
    total: int
    unused: int
    redeemed: int
    revoked: int


class RevokeCodeRequest(BaseModel):
    """Request to revoke an AppSumo code."""
    reason: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Revocation reason is required")
        if len(v) > 255:
            raise ValueError("Reason must be 255 characters or less")
        return v.strip()


@router.post("/admin/codes/generate")
def generate_codes(
    request: GenerateCodesRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """
    Generate new AppSumo codes.

    Admin only. Generates random codes and stores them in the database.
    """
    generated = []
    batch_id = request.batch_id or f"batch-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"

    for _ in range(request.count):
        # Generate unique code
        max_attempts = 10
        for attempt in range(max_attempts):
            code = generate_appsumo_code()
            existing = db.query(models.AppSumoCode).filter(
                models.AppSumoCode.code == code
            ).first()
            if not existing:
                break
        else:
            # Extremely unlikely but handle it
            continue

        code_record = models.AppSumoCode(
            code=code,
            status=models.APPSUMO_CODE_UNUSED,
            batch_id=batch_id,
        )
        db.add(code_record)
        generated.append(code)

    db.commit()

    logger.info(
        f"Generated {len(generated)} AppSumo codes: batch={batch_id}, user={current_user.id}"
    )

    return {
        "success": True,
        "count": len(generated),
        "batch_id": batch_id,
        "codes": generated,
    }


@router.post("/admin/codes/import")
def import_codes(
    request: ImportCodesRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """
    Import existing AppSumo codes.

    Admin only. Used to import codes provided by AppSumo.
    """
    batch_id = request.batch_id or f"import-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    imported = []
    duplicates = []

    for code in request.codes:
        existing = db.query(models.AppSumoCode).filter(
            models.AppSumoCode.code == code
        ).first()

        if existing:
            duplicates.append(code)
            continue

        code_record = models.AppSumoCode(
            code=code,
            status=models.APPSUMO_CODE_UNUSED,
            batch_id=batch_id,
        )
        db.add(code_record)
        imported.append(code)

    db.commit()

    logger.info(
        f"Imported {len(imported)} AppSumo codes: batch={batch_id}, "
        f"duplicates={len(duplicates)}, user={current_user.id}"
    )

    return {
        "success": True,
        "imported_count": len(imported),
        "duplicate_count": len(duplicates),
        "batch_id": batch_id,
        "duplicates": duplicates if duplicates else None,
    }


@router.get("/admin/codes", response_model=CodesListResponse)
def list_codes(
    status: Optional[str] = None,
    batch_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """
    List all AppSumo codes with optional filtering.

    Admin only.
    """
    query = db.query(models.AppSumoCode)

    if status:
        query = query.filter(models.AppSumoCode.status == status)
    if batch_id:
        query = query.filter(models.AppSumoCode.batch_id == batch_id)

    total = query.count()

    codes = query.order_by(models.AppSumoCode.created_at.desc()).offset(offset).limit(limit).all()

    # Get organization names for redeemed codes
    org_ids = [c.redeemed_by_org_id for c in codes if c.redeemed_by_org_id]
    org_names = {}
    if org_ids:
        orgs = db.query(models.Organization).filter(models.Organization.id.in_(org_ids)).all()
        org_names = {o.id: o.name for o in orgs}

    # Get counts by status
    unused_count = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.status == models.APPSUMO_CODE_UNUSED
    ).count()
    redeemed_count = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.status == models.APPSUMO_CODE_REDEEMED
    ).count()
    revoked_count = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.status == models.APPSUMO_CODE_REVOKED
    ).count()

    return CodesListResponse(
        codes=[
            CodeInfo(
                code=c.code,
                status=c.status,
                created_at=c.created_at.isoformat(),
                redeemed_at=c.redeemed_at.isoformat() if c.redeemed_at else None,
                redeemed_by_org_id=c.redeemed_by_org_id,
                redeemed_by_org_name=org_names.get(c.redeemed_by_org_id),
                revoked_at=c.revoked_at.isoformat() if c.revoked_at else None,
                revoked_reason=c.revoked_reason,
                batch_id=c.batch_id,
            )
            for c in codes
        ],
        total=total,
        unused=unused_count,
        redeemed=redeemed_count,
        revoked=revoked_count,
    )


@router.post("/admin/codes/{code}/revoke")
def revoke_code(
    code: str,
    request: RevokeCodeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """
    Revoke an AppSumo code.

    Admin only. Revoked codes cannot be redeemed.
    If the code was already redeemed, this does NOT affect the organization's plan.
    """
    code_upper = code.strip().upper()
    code_record = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.code == code_upper
    ).first()

    if not code_record:
        raise HTTPException(status_code=404, detail="Code not found")

    if code_record.status == models.APPSUMO_CODE_REVOKED:
        raise HTTPException(status_code=400, detail="Code is already revoked")

    was_redeemed = code_record.status == models.APPSUMO_CODE_REDEEMED

    code_record.status = models.APPSUMO_CODE_REVOKED
    code_record.revoked_at = datetime.utcnow()
    code_record.revoked_reason = request.reason

    db.commit()

    logger.info(
        f"AppSumo code revoked: code={code_upper[:8]}..., "
        f"was_redeemed={was_redeemed}, reason={request.reason}, user={current_user.id}"
    )

    return {
        "success": True,
        "code": code_upper,
        "was_redeemed": was_redeemed,
        "message": (
            "Code revoked. Note: Organization still has active AppSumo plan."
            if was_redeemed
            else "Code revoked and can no longer be redeemed."
        ),
    }


@router.get("/admin/codes/stats")
def get_code_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """
    Get AppSumo code statistics.

    Admin only.
    """
    from sqlalchemy import func

    total = db.query(models.AppSumoCode).count()
    unused = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.status == models.APPSUMO_CODE_UNUSED
    ).count()
    redeemed = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.status == models.APPSUMO_CODE_REDEEMED
    ).count()
    revoked = db.query(models.AppSumoCode).filter(
        models.AppSumoCode.status == models.APPSUMO_CODE_REVOKED
    ).count()

    # Get batch counts
    batches = (
        db.query(
            models.AppSumoCode.batch_id,
            func.count(models.AppSumoCode.id).label("count"),
        )
        .group_by(models.AppSumoCode.batch_id)
        .all()
    )

    return {
        "total": total,
        "unused": unused,
        "redeemed": redeemed,
        "revoked": revoked,
        "redemption_rate": round(redeemed / total * 100, 1) if total > 0 else 0,
        "batches": [
            {"batch_id": b.batch_id or "no-batch", "count": b.count}
            for b in batches
        ],
    }
