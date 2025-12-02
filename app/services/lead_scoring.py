# app/services/lead_scoring.py
"""
Lead Scoring and Predictive Analytics for Site2CRM.

Scoring Algorithm (0-100):
- Engagement Score (0-30): Activity count, recency, response rate
- Source Quality (0-20): Historical conversion rate of lead source
- Deal Value (0-20): Relative to organization's average deal size
- Velocity Score (0-15): How fast lead progresses through stages
- Fit Score (0-15): Company size, completeness of profile

Predictive Features:
- Win Probability: ML-like prediction based on similar leads
- Best Next Action: Recommended activity based on stage and history
- Predicted Close Date: Based on avg days to close for similar leads
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import models


@dataclass
class LeadScore:
    """Complete lead scoring result."""
    lead_id: int
    total_score: int  # 0-100

    # Component scores
    engagement_score: int  # 0-30
    source_score: int  # 0-20
    value_score: int  # 0-20
    velocity_score: int  # 0-15
    fit_score: int  # 0-15

    # Predictive
    win_probability: float  # 0-100%
    predicted_close_days: Optional[int]
    best_next_action: str

    # Metadata
    score_reasons: list[str]
    risk_factors: list[str]


class LeadScoringService:
    """Lead scoring and predictive analytics service."""

    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self._cache = {}
        self._load_org_benchmarks()

    def _load_org_benchmarks(self):
        """Load organization benchmarks for scoring."""
        # Average deal size
        avg_deal = self.db.query(func.avg(models.Lead.deal_value)).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.deal_value.isnot(None),
        ).scalar()
        self._cache['avg_deal_value'] = float(avg_deal or 50000)

        # Source conversion rates
        sources = self.db.query(
            models.Lead.source,
            func.count(models.Lead.id).label('total'),
            func.sum(
                func.cast(models.Lead.status == models.LEAD_STATUS_WON, models.Integer)
            ).label('won')
        ).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.source.isnot(None),
        ).group_by(models.Lead.source).all()

        self._cache['source_rates'] = {
            s.source: (s.won or 0) / max(s.total, 1) * 100
            for s in sources
        }

        # Average activities per won lead
        won_lead_ids = [l.id for l in self.db.query(models.Lead.id).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.status == models.LEAD_STATUS_WON,
        ).all()]

        if won_lead_ids:
            avg_activities = self.db.query(func.avg(
                self.db.query(func.count(models.LeadActivity.id)).filter(
                    models.LeadActivity.lead_id == models.Lead.id
                ).correlate(models.Lead).scalar_subquery()
            )).filter(models.Lead.id.in_(won_lead_ids)).scalar()
            self._cache['avg_activities_won'] = float(avg_activities or 10)
        else:
            self._cache['avg_activities_won'] = 10

        # Average days to close
        closed_leads = self.db.query(models.Lead).filter(
            models.Lead.organization_id == self.org_id,
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.closed_at.isnot(None),
        ).all()

        if closed_leads:
            days = [(l.closed_at - l.created_at).days for l in closed_leads if l.closed_at and l.created_at]
            self._cache['avg_days_to_close'] = sum(days) / len(days) if days else 30
        else:
            self._cache['avg_days_to_close'] = 30

    def score_lead(self, lead: models.Lead) -> LeadScore:
        """Calculate comprehensive score for a lead."""
        reasons = []
        risks = []

        # 1. Engagement Score (0-30)
        engagement = self._calculate_engagement(lead, reasons, risks)

        # 2. Source Quality Score (0-20)
        source = self._calculate_source_score(lead, reasons, risks)

        # 3. Deal Value Score (0-20)
        value = self._calculate_value_score(lead, reasons, risks)

        # 4. Velocity Score (0-15)
        velocity = self._calculate_velocity_score(lead, reasons, risks)

        # 5. Fit Score (0-15)
        fit = self._calculate_fit_score(lead, reasons, risks)

        # Total Score
        total = engagement + source + value + velocity + fit

        # Predictive Analytics
        win_prob = self._predict_win_probability(lead, total)
        close_days = self._predict_close_days(lead)
        next_action = self._recommend_next_action(lead)

        return LeadScore(
            lead_id=lead.id,
            total_score=total,
            engagement_score=engagement,
            source_score=source,
            value_score=value,
            velocity_score=velocity,
            fit_score=fit,
            win_probability=win_prob,
            predicted_close_days=close_days,
            best_next_action=next_action,
            score_reasons=reasons,
            risk_factors=risks,
        )

    def _calculate_engagement(self, lead: models.Lead, reasons: list, risks: list) -> int:
        """Calculate engagement score (0-30)."""
        score = 0
        now = datetime.utcnow()

        # Activity count (0-15)
        activity_count = self.db.query(func.count(models.LeadActivity.id)).filter(
            models.LeadActivity.lead_id == lead.id
        ).scalar() or 0

        target_activities = self._cache['avg_activities_won']
        activity_ratio = min(activity_count / max(target_activities, 1), 1.5)
        activity_score = int(activity_ratio * 10)
        score += min(activity_score, 15)

        if activity_count >= target_activities:
            reasons.append(f"High engagement: {activity_count} activities")
        elif activity_count < 3:
            risks.append("Low activity count - needs more touchpoints")

        # Recency (0-10)
        last_activity = self.db.query(func.max(models.LeadActivity.activity_at)).filter(
            models.LeadActivity.lead_id == lead.id
        ).scalar()

        if last_activity:
            days_since = (now - last_activity).days
            if days_since <= 3:
                score += 10
                reasons.append("Recent activity (within 3 days)")
            elif days_since <= 7:
                score += 7
            elif days_since <= 14:
                score += 4
            elif days_since <= 30:
                score += 2
            else:
                risks.append(f"No activity in {days_since} days - going stale")
        else:
            risks.append("No activities logged yet")

        # Meeting held bonus (0-5)
        meetings = self.db.query(func.count(models.LeadActivity.id)).filter(
            models.LeadActivity.lead_id == lead.id,
            models.LeadActivity.activity_type == models.ACTIVITY_MEETING,
        ).scalar() or 0

        if meetings > 0:
            score += min(meetings * 2, 5)
            reasons.append(f"{meetings} meeting(s) held")

        return min(score, 30)

    def _calculate_source_score(self, lead: models.Lead, reasons: list, risks: list) -> int:
        """Calculate source quality score (0-20)."""
        if not lead.source:
            return 5  # Unknown source gets middle score

        source_rate = self._cache['source_rates'].get(lead.source, 25)

        # Scale: 0-10% = 5pts, 10-20% = 10pts, 20-30% = 15pts, 30%+ = 20pts
        if source_rate >= 30:
            score = 20
            reasons.append(f"High-converting source: {lead.source} ({source_rate:.0f}% win rate)")
        elif source_rate >= 20:
            score = 15
        elif source_rate >= 10:
            score = 10
        else:
            score = 5
            risks.append(f"Low-converting source: {lead.source} ({source_rate:.0f}% win rate)")

        return score

    def _calculate_value_score(self, lead: models.Lead, reasons: list, risks: list) -> int:
        """Calculate deal value score (0-20)."""
        if not lead.deal_value:
            return 8  # Unknown value gets middle score

        avg = self._cache['avg_deal_value']
        value = float(lead.deal_value)

        ratio = value / avg if avg > 0 else 1

        if ratio >= 2:
            score = 20
            reasons.append(f"High-value deal: ${value:,.0f} (2x+ avg)")
        elif ratio >= 1.5:
            score = 17
            reasons.append(f"Above-average deal: ${value:,.0f}")
        elif ratio >= 1:
            score = 14
        elif ratio >= 0.5:
            score = 10
        else:
            score = 6
            risks.append(f"Below-average deal size: ${value:,.0f}")

        return score

    def _calculate_velocity_score(self, lead: models.Lead, reasons: list, risks: list) -> int:
        """Calculate pipeline velocity score (0-15)."""
        score = 0

        # Stage progression points
        stage_points = {
            models.LEAD_STATUS_NEW: 0,
            models.LEAD_STATUS_CONTACTED: 3,
            models.LEAD_STATUS_QUALIFIED: 6,
            models.LEAD_STATUS_PROPOSAL: 10,
            models.LEAD_STATUS_NEGOTIATION: 13,
            models.LEAD_STATUS_WON: 15,
            models.LEAD_STATUS_LOST: 0,
        }

        base_score = stage_points.get(lead.status, 0)

        # Time-based adjustment
        if lead.created_at:
            days_in_pipeline = (datetime.utcnow() - lead.created_at).days
            avg_days = self._cache['avg_days_to_close']

            if days_in_pipeline < avg_days * 0.5 and lead.status in [models.LEAD_STATUS_PROPOSAL, models.LEAD_STATUS_NEGOTIATION]:
                base_score = min(base_score + 2, 15)
                reasons.append("Fast mover - ahead of schedule")
            elif days_in_pipeline > avg_days * 1.5 and lead.status not in [models.LEAD_STATUS_WON, models.LEAD_STATUS_LOST]:
                base_score = max(base_score - 3, 0)
                risks.append(f"Slow progress - {days_in_pipeline} days in pipeline")

        return base_score

    def _calculate_fit_score(self, lead: models.Lead, reasons: list, risks: list) -> int:
        """Calculate profile fit score (0-15)."""
        score = 0

        # Profile completeness
        fields = [lead.name, lead.email, lead.phone, lead.company, lead.notes]
        filled = sum(1 for f in fields if f)
        completeness = filled / len(fields)

        score += int(completeness * 8)

        if completeness >= 0.8:
            reasons.append("Complete lead profile")
        elif completeness < 0.4:
            risks.append("Incomplete profile - missing key data")

        # Has company (B2B indicator)
        if lead.company:
            score += 4

        # Has phone (more serious buyer)
        if lead.phone:
            score += 3

        return min(score, 15)

    def _predict_win_probability(self, lead: models.Lead, score: int) -> float:
        """Predict win probability based on score and status."""
        # Base probability from score
        base_prob = score * 0.8  # Score 100 = 80% base

        # Stage multipliers
        stage_mult = {
            models.LEAD_STATUS_NEW: 0.3,
            models.LEAD_STATUS_CONTACTED: 0.5,
            models.LEAD_STATUS_QUALIFIED: 0.7,
            models.LEAD_STATUS_PROPOSAL: 0.85,
            models.LEAD_STATUS_NEGOTIATION: 0.95,
            models.LEAD_STATUS_WON: 1.0,
            models.LEAD_STATUS_LOST: 0.0,
        }

        mult = stage_mult.get(lead.status, 0.5)
        prob = base_prob * mult

        # Cap at realistic ranges
        if lead.status == models.LEAD_STATUS_WON:
            return 100.0
        elif lead.status == models.LEAD_STATUS_LOST:
            return 0.0

        return min(max(prob, 5), 95)

    def _predict_close_days(self, lead: models.Lead) -> Optional[int]:
        """Predict days until close."""
        if lead.status in [models.LEAD_STATUS_WON, models.LEAD_STATUS_LOST]:
            return None

        avg = self._cache['avg_days_to_close']
        days_so_far = (datetime.utcnow() - lead.created_at).days if lead.created_at else 0

        # Stage progress factor
        progress = {
            models.LEAD_STATUS_NEW: 0.1,
            models.LEAD_STATUS_CONTACTED: 0.25,
            models.LEAD_STATUS_QUALIFIED: 0.5,
            models.LEAD_STATUS_PROPOSAL: 0.75,
            models.LEAD_STATUS_NEGOTIATION: 0.9,
        }

        stage_progress = progress.get(lead.status, 0.1)
        remaining_ratio = 1 - stage_progress

        predicted_remaining = int(avg * remaining_ratio)
        return max(predicted_remaining, 1)

    def _recommend_next_action(self, lead: models.Lead) -> str:
        """Recommend best next action based on lead state."""
        # Get recent activities
        recent = self.db.query(models.LeadActivity).filter(
            models.LeadActivity.lead_id == lead.id
        ).order_by(models.LeadActivity.activity_at.desc()).limit(3).all()

        recent_types = [a.activity_type for a in recent]

        # Stage-based recommendations
        if lead.status == models.LEAD_STATUS_NEW:
            return "Send introduction email or make initial call"

        elif lead.status == models.LEAD_STATUS_CONTACTED:
            if models.ACTIVITY_CALL not in recent_types:
                return "Schedule a discovery call"
            return "Follow up to qualify needs and budget"

        elif lead.status == models.LEAD_STATUS_QUALIFIED:
            if models.ACTIVITY_MEETING not in recent_types:
                return "Schedule a demo or consultation meeting"
            return "Send proposal or pricing information"

        elif lead.status == models.LEAD_STATUS_PROPOSAL:
            if len(recent) == 0 or (datetime.utcnow() - recent[0].activity_at).days > 3:
                return "Follow up on proposal - address questions"
            return "Schedule negotiation call to close"

        elif lead.status == models.LEAD_STATUS_NEGOTIATION:
            return "Address final objections and send contract"

        return "Review lead and update status"

    def score_all_leads(self, status_filter: list[str] = None) -> list[LeadScore]:
        """Score all leads in organization."""
        query = self.db.query(models.Lead).filter(
            models.Lead.organization_id == self.org_id,
        )

        if status_filter:
            query = query.filter(models.Lead.status.in_(status_filter))
        else:
            # Exclude closed leads by default
            query = query.filter(models.Lead.status.notin_([
                models.LEAD_STATUS_WON,
                models.LEAD_STATUS_LOST,
            ]))

        leads = query.all()
        return [self.score_lead(lead) for lead in leads]

    def get_hot_leads(self, limit: int = 10) -> list[LeadScore]:
        """Get top scoring active leads."""
        scores = self.score_all_leads()
        scores.sort(key=lambda x: x.total_score, reverse=True)
        return scores[:limit]

    def get_at_risk_leads(self, limit: int = 10) -> list[LeadScore]:
        """Get leads at risk of being lost."""
        scores = self.score_all_leads()
        at_risk = [s for s in scores if len(s.risk_factors) >= 2 or s.total_score < 40]
        at_risk.sort(key=lambda x: x.total_score)
        return at_risk[:limit]


def calculate_lead_score(db: Session, lead: models.Lead) -> LeadScore:
    """Convenience function to score a single lead."""
    service = LeadScoringService(db, lead.organization_id)
    return service.score_lead(lead)
