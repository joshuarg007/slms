# app/api/routes/scoring.py
"""Lead Scoring API routes for Site2CRM."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db import models
from app.db.session import SessionLocal
from app.services.lead_scoring import LeadScoringService, LeadScore

router = APIRouter(prefix="/scoring", tags=["Lead Scoring"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Response Models
class LeadScoreResponse(BaseModel):
    lead_id: int
    lead_name: str
    lead_email: str
    lead_company: Optional[str]
    lead_status: str

    total_score: int
    engagement_score: int
    source_score: int
    value_score: int
    velocity_score: int
    fit_score: int

    win_probability: float
    predicted_close_days: Optional[int]
    best_next_action: str

    score_reasons: list[str]
    risk_factors: list[str]


class ScoredLeadsResponse(BaseModel):
    leads: list[LeadScoreResponse]
    total_count: int
    avg_score: float
    high_score_count: int  # Score >= 70
    at_risk_count: int  # Score < 40 or 2+ risk factors


class ScoreDistribution(BaseModel):
    hot: int  # 70-100
    warm: int  # 50-69
    cool: int  # 30-49
    cold: int  # 0-29


class ScoringInsights(BaseModel):
    total_active_leads: int
    avg_score: float
    distribution: ScoreDistribution
    top_sources: list[dict]  # Sources with highest avg scores
    at_risk_leads: int
    hot_leads: int


def _lead_score_to_response(score: LeadScore, lead: models.Lead) -> LeadScoreResponse:
    """Convert LeadScore to API response."""
    return LeadScoreResponse(
        lead_id=score.lead_id,
        lead_name=lead.name,
        lead_email=lead.email,
        lead_company=lead.company,
        lead_status=lead.status,
        total_score=score.total_score,
        engagement_score=score.engagement_score,
        source_score=score.source_score,
        value_score=score.value_score,
        velocity_score=score.velocity_score,
        fit_score=score.fit_score,
        win_probability=round(score.win_probability, 1),
        predicted_close_days=score.predicted_close_days,
        best_next_action=score.best_next_action,
        score_reasons=score.score_reasons,
        risk_factors=score.risk_factors,
    )


@router.get("/lead/{lead_id}", response_model=LeadScoreResponse)
def get_lead_score(
    lead_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get score for a specific lead."""
    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.organization_id == user.organization_id,
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    service = LeadScoringService(db, user.organization_id)
    score = service.score_lead(lead)

    # Update lead with score
    lead.score = score.total_score
    lead.score_engagement = score.engagement_score
    lead.score_source = score.source_score
    lead.score_value = score.value_score
    lead.score_velocity = score.velocity_score
    lead.score_fit = score.fit_score
    lead.win_probability = int(score.win_probability)
    lead.score_updated_at = datetime.utcnow()
    db.commit()

    return _lead_score_to_response(score, lead)


@router.get("/leads", response_model=ScoredLeadsResponse)
def get_scored_leads(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    min_score: int = Query(default=0, ge=0, le=100),
    max_score: int = Query(default=100, ge=0, le=100),
    limit: int = Query(default=50, ge=1, le=200),
    sort: str = Query(default="score", description="Sort by: score, win_probability, created_at"),
):
    """Get all scored leads with filtering and sorting."""
    service = LeadScoringService(db, user.organization_id)

    # Build query
    query = db.query(models.Lead).filter(
        models.Lead.organization_id == user.organization_id,
    )

    if status:
        query = query.filter(models.Lead.status == status)
    else:
        # Exclude closed leads by default
        query = query.filter(models.Lead.status.notin_([
            models.LEAD_STATUS_WON,
            models.LEAD_STATUS_LOST,
        ]))

    leads = query.all()

    # Score all leads
    results = []
    for lead in leads:
        score = service.score_lead(lead)

        # Apply score filter
        if score.total_score < min_score or score.total_score > max_score:
            continue

        # Update lead with score
        lead.score = score.total_score
        lead.score_engagement = score.engagement_score
        lead.score_source = score.source_score
        lead.score_value = score.value_score
        lead.score_velocity = score.velocity_score
        lead.score_fit = score.fit_score
        lead.win_probability = int(score.win_probability)
        lead.score_updated_at = datetime.utcnow()

        results.append((score, lead))

    db.commit()

    # Sort
    if sort == "win_probability":
        results.sort(key=lambda x: x[0].win_probability, reverse=True)
    elif sort == "created_at":
        results.sort(key=lambda x: x[1].created_at or datetime.min, reverse=True)
    else:  # score
        results.sort(key=lambda x: x[0].total_score, reverse=True)

    # Limit
    results = results[:limit]

    # Calculate summary stats
    all_scores = [r[0].total_score for r in results]
    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

    return ScoredLeadsResponse(
        leads=[_lead_score_to_response(s, l) for s, l in results],
        total_count=len(results),
        avg_score=round(avg_score, 1),
        high_score_count=sum(1 for s in all_scores if s >= 70),
        at_risk_count=sum(1 for s, l in results if s.total_score < 40 or len(s.risk_factors) >= 2),
    )


@router.get("/hot", response_model=list[LeadScoreResponse])
def get_hot_leads(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    limit: int = Query(default=10, ge=1, le=50),
):
    """Get top scoring 'hot' leads."""
    service = LeadScoringService(db, user.organization_id)
    scores = service.get_hot_leads(limit)

    results = []
    for score in scores:
        lead = db.get(models.Lead, score.lead_id)
        if lead:
            # Update lead score
            lead.score = score.total_score
            lead.win_probability = int(score.win_probability)
            lead.score_updated_at = datetime.utcnow()
            results.append(_lead_score_to_response(score, lead))

    db.commit()
    return results


@router.get("/at-risk", response_model=list[LeadScoreResponse])
def get_at_risk_leads(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    limit: int = Query(default=10, ge=1, le=50),
):
    """Get leads at risk of being lost."""
    service = LeadScoringService(db, user.organization_id)
    scores = service.get_at_risk_leads(limit)

    results = []
    for score in scores:
        lead = db.get(models.Lead, score.lead_id)
        if lead:
            lead.score = score.total_score
            lead.win_probability = int(score.win_probability)
            lead.score_updated_at = datetime.utcnow()
            results.append(_lead_score_to_response(score, lead))

    db.commit()
    return results


@router.get("/insights", response_model=ScoringInsights)
def get_scoring_insights(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get overall scoring insights and distribution."""
    service = LeadScoringService(db, user.organization_id)
    scores = service.score_all_leads()

    if not scores:
        return ScoringInsights(
            total_active_leads=0,
            avg_score=0,
            distribution=ScoreDistribution(hot=0, warm=0, cool=0, cold=0),
            top_sources=[],
            at_risk_leads=0,
            hot_leads=0,
        )

    # Distribution
    hot = sum(1 for s in scores if s.total_score >= 70)
    warm = sum(1 for s in scores if 50 <= s.total_score < 70)
    cool = sum(1 for s in scores if 30 <= s.total_score < 50)
    cold = sum(1 for s in scores if s.total_score < 30)

    # Average
    avg = sum(s.total_score for s in scores) / len(scores)

    # At risk
    at_risk = sum(1 for s in scores if s.total_score < 40 or len(s.risk_factors) >= 2)

    # Top sources by avg score
    source_scores = {}
    for score in scores:
        lead = db.get(models.Lead, score.lead_id)
        if lead and lead.source:
            if lead.source not in source_scores:
                source_scores[lead.source] = []
            source_scores[lead.source].append(score.total_score)

    top_sources = [
        {"source": src, "avg_score": round(sum(sc) / len(sc), 1), "count": len(sc)}
        for src, sc in source_scores.items()
    ]
    top_sources.sort(key=lambda x: x["avg_score"], reverse=True)

    return ScoringInsights(
        total_active_leads=len(scores),
        avg_score=round(avg, 1),
        distribution=ScoreDistribution(hot=hot, warm=warm, cool=cool, cold=cold),
        top_sources=top_sources[:5],
        at_risk_leads=at_risk,
        hot_leads=hot,
    )


@router.post("/refresh")
def refresh_all_scores(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Refresh scores for all active leads."""
    service = LeadScoringService(db, user.organization_id)
    scores = service.score_all_leads()

    updated = 0
    for score in scores:
        lead = db.get(models.Lead, score.lead_id)
        if lead:
            lead.score = score.total_score
            lead.score_engagement = score.engagement_score
            lead.score_source = score.source_score
            lead.score_value = score.value_score
            lead.score_velocity = score.velocity_score
            lead.score_fit = score.fit_score
            lead.win_probability = int(score.win_probability)
            lead.score_updated_at = datetime.utcnow()
            updated += 1

    db.commit()

    return {"message": f"Updated scores for {updated} leads"}
