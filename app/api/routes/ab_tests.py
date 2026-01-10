"""API routes for A/B testing."""

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import models
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.schemas.ab_test import (
    ABTestCreate,
    ABTestUpdate,
    ABTestOut,
    ABTestListItem,
    ABTestResultsOut,
    FormVariantCreate,
    FormVariantUpdate,
    FormVariantOut,
)

router = APIRouter(prefix="/ab-tests", tags=["A/B Testing"])


def variant_to_out(v: models.FormVariant) -> FormVariantOut:
    """Convert variant model to response schema."""
    config = {}
    try:
        config = json.loads(v.config_overrides) if v.config_overrides else {}
    except json.JSONDecodeError:
        pass

    conversion_rate = (v.conversions / v.impressions * 100) if v.impressions > 0 else 0.0

    return FormVariantOut(
        id=v.id,
        ab_test_id=v.ab_test_id,
        name=v.name,
        is_control=v.is_control,
        weight=v.weight,
        config_overrides=config,
        impressions=v.impressions,
        conversions=v.conversions,
        conversion_rate=round(conversion_rate, 2),
        created_at=v.created_at,
        updated_at=v.updated_at,
    )


def test_to_out(t: models.ABTest) -> ABTestOut:
    """Convert test model to response schema."""
    variants = [variant_to_out(v) for v in t.variants]
    total_impressions = sum(v.impressions for v in variants)
    total_conversions = sum(v.conversions for v in variants)
    overall_rate = (total_conversions / total_impressions * 100) if total_impressions > 0 else 0.0

    return ABTestOut(
        id=t.id,
        organization_id=t.organization_id,
        name=t.name,
        description=t.description,
        status=t.status,
        goal_type=t.goal_type,
        started_at=t.started_at,
        ended_at=t.ended_at,
        created_at=t.created_at,
        updated_at=t.updated_at,
        variants=variants,
        total_impressions=total_impressions,
        total_conversions=total_conversions,
        overall_conversion_rate=round(overall_rate, 2),
    )


@router.get("", response_model=List[ABTestListItem])
def list_ab_tests(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all A/B tests for the organization."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    query = db.query(models.ABTest).filter(models.ABTest.organization_id == org_id)

    if status:
        query = query.filter(models.ABTest.status == status)

    tests = query.order_by(models.ABTest.created_at.desc()).all()

    result = []
    for t in tests:
        total_imp = sum(v.impressions for v in t.variants)
        total_conv = sum(v.conversions for v in t.variants)
        rate = (total_conv / total_imp * 100) if total_imp > 0 else 0.0

        result.append(ABTestListItem(
            id=t.id,
            name=t.name,
            status=t.status,
            variants_count=len(t.variants),
            total_impressions=total_imp,
            total_conversions=total_conv,
            conversion_rate=round(rate, 2),
            created_at=t.created_at,
        ))

    return result


@router.post("", response_model=ABTestOut)
def create_ab_test(
    payload: ABTestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new A/B test with variants."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    # Check if there's already a running test
    running = db.query(models.ABTest).filter(
        models.ABTest.organization_id == org_id,
        models.ABTest.status == models.AB_TEST_STATUS_RUNNING,
    ).first()

    if running:
        raise HTTPException(
            status_code=400,
            detail="You already have a running A/B test. Please pause or complete it first."
        )

    now = datetime.utcnow()

    test = models.ABTest(
        organization_id=org_id,
        name=payload.name,
        description=payload.description,
        goal_type=payload.goal_type,
        status=models.AB_TEST_STATUS_DRAFT,
        created_at=now,
        updated_at=now,
    )
    db.add(test)
    db.flush()  # Get the test ID

    # Create default variants if none provided
    if not payload.variants:
        # Create Control and Variant A by default
        default_variants = [
            FormVariantCreate(name="Control", is_control=True, weight=50),
            FormVariantCreate(name="Variant A", is_control=False, weight=50),
        ]
    else:
        default_variants = payload.variants

    for v in default_variants:
        variant = models.FormVariant(
            ab_test_id=test.id,
            name=v.name,
            is_control=v.is_control,
            weight=v.weight,
            config_overrides=json.dumps(v.config_overrides),
            created_at=now,
            updated_at=now,
        )
        db.add(variant)

    db.commit()
    db.refresh(test)

    return test_to_out(test)


@router.get("/{test_id}", response_model=ABTestOut)
def get_ab_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific A/B test."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    test = db.query(models.ABTest).filter(
        models.ABTest.id == test_id,
        models.ABTest.organization_id == org_id,
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")

    return test_to_out(test)


@router.patch("/{test_id}", response_model=ABTestOut)
def update_ab_test(
    test_id: int,
    payload: ABTestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update an A/B test (name, description, status)."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    test = db.query(models.ABTest).filter(
        models.ABTest.id == test_id,
        models.ABTest.organization_id == org_id,
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")

    now = datetime.utcnow()

    if payload.name is not None:
        test.name = payload.name

    if payload.description is not None:
        test.description = payload.description

    if payload.status is not None:
        old_status = test.status
        new_status = payload.status

        # Validate status transitions
        if new_status == models.AB_TEST_STATUS_RUNNING:
            if len(test.variants) < 2:
                raise HTTPException(
                    status_code=400,
                    detail="A/B test needs at least 2 variants to run"
                )
            # Check for other running tests
            other_running = db.query(models.ABTest).filter(
                models.ABTest.organization_id == org_id,
                models.ABTest.status == models.AB_TEST_STATUS_RUNNING,
                models.ABTest.id != test_id,
            ).first()
            if other_running:
                raise HTTPException(
                    status_code=400,
                    detail="You already have a running A/B test. Pause or complete it first."
                )
            if old_status == models.AB_TEST_STATUS_DRAFT:
                test.started_at = now

        if new_status == models.AB_TEST_STATUS_COMPLETED:
            test.ended_at = now

        test.status = new_status

    test.updated_at = now
    db.commit()
    db.refresh(test)

    return test_to_out(test)


@router.delete("/{test_id}")
def delete_ab_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete an A/B test."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    test = db.query(models.ABTest).filter(
        models.ABTest.id == test_id,
        models.ABTest.organization_id == org_id,
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")

    if test.status == models.AB_TEST_STATUS_RUNNING:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a running test. Pause or complete it first."
        )

    db.delete(test)
    db.commit()

    return {"message": "A/B test deleted"}


# Variant endpoints
@router.post("/{test_id}/variants", response_model=FormVariantOut)
def add_variant(
    test_id: int,
    payload: FormVariantCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a variant to an A/B test."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    test = db.query(models.ABTest).filter(
        models.ABTest.id == test_id,
        models.ABTest.organization_id == org_id,
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")

    if test.status == models.AB_TEST_STATUS_RUNNING:
        raise HTTPException(
            status_code=400,
            detail="Cannot add variants to a running test. Pause it first."
        )

    now = datetime.utcnow()
    variant = models.FormVariant(
        ab_test_id=test.id,
        name=payload.name,
        is_control=payload.is_control,
        weight=payload.weight,
        config_overrides=json.dumps(payload.config_overrides),
        created_at=now,
        updated_at=now,
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)

    return variant_to_out(variant)


@router.patch("/{test_id}/variants/{variant_id}", response_model=FormVariantOut)
def update_variant(
    test_id: int,
    variant_id: int,
    payload: FormVariantUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a variant in an A/B test."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    variant = db.query(models.FormVariant).join(models.ABTest).filter(
        models.FormVariant.id == variant_id,
        models.FormVariant.ab_test_id == test_id,
        models.ABTest.organization_id == org_id,
    ).first()

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    if variant.ab_test.status == models.AB_TEST_STATUS_RUNNING:
        raise HTTPException(
            status_code=400,
            detail="Cannot update variants on a running test. Pause it first."
        )

    if payload.name is not None:
        variant.name = payload.name

    if payload.weight is not None:
        variant.weight = payload.weight

    if payload.config_overrides is not None:
        variant.config_overrides = json.dumps(payload.config_overrides)

    variant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(variant)

    return variant_to_out(variant)


@router.delete("/{test_id}/variants/{variant_id}")
def delete_variant(
    test_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a variant from an A/B test."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    variant = db.query(models.FormVariant).join(models.ABTest).filter(
        models.FormVariant.id == variant_id,
        models.FormVariant.ab_test_id == test_id,
        models.ABTest.organization_id == org_id,
    ).first()

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    if variant.ab_test.status == models.AB_TEST_STATUS_RUNNING:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete variants from a running test. Pause it first."
        )

    test = variant.ab_test
    if len(test.variants) <= 2:
        raise HTTPException(
            status_code=400,
            detail="A/B test must have at least 2 variants"
        )

    db.delete(variant)
    db.commit()

    return {"message": "Variant deleted"}


@router.get("/{test_id}/results", response_model=ABTestResultsOut)
def get_test_results(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get detailed results and winner analysis for an A/B test."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    test = db.query(models.ABTest).filter(
        models.ABTest.id == test_id,
        models.ABTest.organization_id == org_id,
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")

    test_out = test_to_out(test)
    variants = test_out.variants

    # Find the winner (highest conversion rate with minimum sample)
    MIN_IMPRESSIONS = 100
    winner = None
    best_rate = 0.0

    for v in variants:
        if v.impressions >= MIN_IMPRESSIONS and v.conversion_rate > best_rate:
            best_rate = v.conversion_rate
            winner = v

    # Simple statistical significance check (very basic)
    # In production, you'd use proper statistical tests (chi-squared, etc.)
    significance = None
    recommendation = "Continue testing"

    if len(variants) >= 2 and all(v.impressions >= MIN_IMPRESSIONS for v in variants):
        rates = [v.conversion_rate for v in variants]
        max_rate = max(rates)
        min_rate = min(rates)

        if max_rate > 0:
            # Rough lift calculation
            lift = ((max_rate - min_rate) / max_rate) * 100

            if lift >= 20 and test_out.total_impressions >= 500:
                significance = min(95.0, 70 + lift)
                if winner:
                    recommendation = f"'{winner.name}' appears to be the winner with {winner.conversion_rate}% conversion rate"
            elif test_out.total_impressions >= 1000:
                significance = 60.0
                recommendation = "Results are inconclusive. Consider running longer or with bigger changes."
            else:
                recommendation = f"Need more data. Currently at {test_out.total_impressions} impressions."
    else:
        min_needed = MIN_IMPRESSIONS * len(variants)
        recommendation = f"Need at least {min_needed} total impressions for meaningful results"

    return ABTestResultsOut(
        test=test_out,
        winner=winner,
        statistical_significance=significance,
        recommendation=recommendation,
    )
