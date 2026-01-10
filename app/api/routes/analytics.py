# app/api/routes/analytics.py
"""Sales Analytics and KPI API routes for Site2CRM."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, case, and_
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db import models
from app.db.session import SessionLocal

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# Response Models
# ============================================================================

class SalespersonKPI(BaseModel):
    user_id: int
    display_name: str
    email: str

    # Pipeline metrics
    total_leads: int
    won_leads: int
    lost_leads: int
    in_pipeline: int
    close_rate: float  # won / (won + lost)

    # Revenue metrics
    total_revenue: float
    avg_deal_size: float
    quota: float
    quota_attainment: float  # revenue / quota

    # Activity metrics
    calls_count: int
    emails_count: int
    meetings_count: int
    total_activities: int
    activities_per_lead: float

    # Efficiency
    avg_days_to_close: float


class TeamKPISummary(BaseModel):
    period_start: datetime
    period_end: datetime

    # Team totals
    total_leads: int
    total_won: int
    total_lost: int
    total_pipeline: int
    team_close_rate: float

    # Revenue
    total_revenue: float
    avg_deal_size: float

    # Activities
    total_calls: int
    total_emails: int
    total_meetings: int

    # By salesperson
    salespeople: list[SalespersonKPI]


class LeadSourceMetrics(BaseModel):
    source: str
    total_leads: int
    won_leads: int
    lost_leads: int
    close_rate: float
    total_revenue: float
    avg_deal_size: float
    avg_days_to_close: float


class PipelineMetrics(BaseModel):
    status: str
    count: int
    total_value: float
    avg_value: float


class DashboardMetrics(BaseModel):
    # Summary
    total_leads: int
    total_revenue: float
    avg_deal_size: float
    overall_close_rate: float

    # Period comparison
    leads_this_month: int
    leads_last_month: int
    leads_change_pct: float
    revenue_this_month: float
    revenue_last_month: float
    revenue_change_pct: float

    # Pipeline
    pipeline: list[PipelineMetrics]
    pipeline_value: float

    # By source
    by_source: list[LeadSourceMetrics]

    # Activity trends (last 7 days)
    activities_by_day: list[dict]

    # Top performers
    top_performers: list[SalespersonKPI]


class UTMBreakdown(BaseModel):
    """UTM parameter breakdown for source tracking analytics."""
    utm_sources: list[dict]  # [{name: str, count: int}]
    utm_mediums: list[dict]  # [{name: str, count: int}]
    utm_campaigns: list[dict]  # [{name: str, count: int}]
    total_with_utm: int
    total_leads: int


class RecommendationItem(BaseModel):
    category: str  # "sales", "marketing", "pipeline", "coaching"
    priority: str  # "high", "medium", "low"
    title: str
    description: str
    metric: Optional[str] = None
    action: str


class RecommendationsResponse(BaseModel):
    generated_at: datetime
    recommendations: list[RecommendationItem]


# ============================================================================
# Helper Functions
# ============================================================================

def get_salesperson_kpis(
    db: Session,
    org_id: int,
    start_date: datetime,
    end_date: datetime,
) -> list[SalespersonKPI]:
    """Calculate KPIs for all salespeople in the organization."""

    # Get salespeople
    salespeople = db.query(models.Salesperson).filter(
        models.Salesperson.organization_id == org_id,
        models.Salesperson.is_active == True,
    ).all()

    results = []

    for sp in salespeople:
        # Lead stats
        leads_query = db.query(models.Lead).filter(
            models.Lead.organization_id == org_id,
            models.Lead.assigned_user_id == sp.user_id,
            models.Lead.created_at >= start_date,
            models.Lead.created_at <= end_date,
        )

        total_leads = leads_query.count()
        won_leads = leads_query.filter(models.Lead.status == models.LEAD_STATUS_WON).count()
        lost_leads = leads_query.filter(models.Lead.status == models.LEAD_STATUS_LOST).count()
        in_pipeline = total_leads - won_leads - lost_leads

        close_rate = won_leads / max(won_leads + lost_leads, 1)

        # Revenue
        revenue_result = db.query(func.sum(models.Lead.deal_value)).filter(
            models.Lead.organization_id == org_id,
            models.Lead.assigned_user_id == sp.user_id,
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.closed_at >= start_date,
            models.Lead.closed_at <= end_date,
        ).scalar() or Decimal("0")

        total_revenue = float(revenue_result)
        avg_deal_size = total_revenue / max(won_leads, 1)

        quota = float(sp.monthly_quota or 0)
        # Adjust quota for period
        months_in_period = max((end_date - start_date).days / 30, 1)
        period_quota = quota * months_in_period
        quota_attainment = (total_revenue / period_quota * 100) if period_quota > 0 else 0

        # Activities
        activities_query = db.query(models.LeadActivity).filter(
            models.LeadActivity.organization_id == org_id,
            models.LeadActivity.user_id == sp.user_id,
            models.LeadActivity.activity_at >= start_date,
            models.LeadActivity.activity_at <= end_date,
        )

        calls_count = activities_query.filter(
            models.LeadActivity.activity_type == models.ACTIVITY_CALL
        ).count()
        emails_count = activities_query.filter(
            models.LeadActivity.activity_type == models.ACTIVITY_EMAIL
        ).count()
        meetings_count = activities_query.filter(
            models.LeadActivity.activity_type == models.ACTIVITY_MEETING
        ).count()
        total_activities = activities_query.count()

        activities_per_lead = total_activities / max(total_leads, 1)

        # Avg days to close
        closed_leads = leads_query.filter(
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.closed_at.isnot(None),
        ).all()

        if closed_leads:
            days_to_close = [
                (l.closed_at - l.created_at).days
                for l in closed_leads
                if l.closed_at and l.created_at
            ]
            avg_days_to_close = sum(days_to_close) / len(days_to_close) if days_to_close else 0
        else:
            avg_days_to_close = 0

        results.append(SalespersonKPI(
            user_id=sp.user_id,
            display_name=sp.display_name,
            email=sp.user.email,
            total_leads=total_leads,
            won_leads=won_leads,
            lost_leads=lost_leads,
            in_pipeline=in_pipeline,
            close_rate=round(close_rate * 100, 1),
            total_revenue=round(total_revenue, 2),
            avg_deal_size=round(avg_deal_size, 2),
            quota=round(period_quota, 2),
            quota_attainment=round(quota_attainment, 1),
            calls_count=calls_count,
            emails_count=emails_count,
            meetings_count=meetings_count,
            total_activities=total_activities,
            activities_per_lead=round(activities_per_lead, 1),
            avg_days_to_close=round(avg_days_to_close, 1),
        ))

    return sorted(results, key=lambda x: x.total_revenue, reverse=True)


def get_source_metrics(
    db: Session,
    org_id: int,
    start_date: datetime,
    end_date: datetime,
) -> list[LeadSourceMetrics]:
    """Calculate metrics by lead source."""

    sources = db.query(models.Lead.source).filter(
        models.Lead.organization_id == org_id,
        models.Lead.created_at >= start_date,
        models.Lead.created_at <= end_date,
    ).distinct().all()

    results = []

    for (source,) in sources:
        if not source:
            continue

        leads_query = db.query(models.Lead).filter(
            models.Lead.organization_id == org_id,
            models.Lead.source == source,
            models.Lead.created_at >= start_date,
            models.Lead.created_at <= end_date,
        )

        total_leads = leads_query.count()
        won_leads = leads_query.filter(models.Lead.status == models.LEAD_STATUS_WON).count()
        lost_leads = leads_query.filter(models.Lead.status == models.LEAD_STATUS_LOST).count()

        close_rate = won_leads / max(won_leads + lost_leads, 1)

        revenue_result = db.query(func.sum(models.Lead.deal_value)).filter(
            models.Lead.organization_id == org_id,
            models.Lead.source == source,
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.closed_at >= start_date,
            models.Lead.closed_at <= end_date,
        ).scalar() or Decimal("0")

        total_revenue = float(revenue_result)
        avg_deal_size = total_revenue / max(won_leads, 1)

        # Avg days to close
        closed_leads = leads_query.filter(
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.closed_at.isnot(None),
        ).all()

        if closed_leads:
            days_to_close = [
                (l.closed_at - l.created_at).days
                for l in closed_leads
                if l.closed_at and l.created_at
            ]
            avg_days_to_close = sum(days_to_close) / len(days_to_close) if days_to_close else 0
        else:
            avg_days_to_close = 0

        results.append(LeadSourceMetrics(
            source=source,
            total_leads=total_leads,
            won_leads=won_leads,
            lost_leads=lost_leads,
            close_rate=round(close_rate * 100, 1),
            total_revenue=round(total_revenue, 2),
            avg_deal_size=round(avg_deal_size, 2),
            avg_days_to_close=round(avg_days_to_close, 1),
        ))

    return sorted(results, key=lambda x: x.total_revenue, reverse=True)


def generate_recommendations(
    db: Session,
    org_id: int,
    salespeople_kpis: list[SalespersonKPI],
    source_metrics: list[LeadSourceMetrics],
) -> list[RecommendationItem]:
    """Generate AI-powered recommendations based on data analysis."""

    recommendations = []

    # Analyze underperforming salespeople
    avg_close_rate = sum(sp.close_rate for sp in salespeople_kpis) / max(len(salespeople_kpis), 1)

    for sp in salespeople_kpis:
        if sp.close_rate < avg_close_rate * 0.7:  # 30% below average
            recommendations.append(RecommendationItem(
                category="coaching",
                priority="high",
                title=f"Coaching needed: {sp.display_name}",
                description=f"{sp.display_name}'s close rate ({sp.close_rate}%) is significantly below team average ({avg_close_rate:.1f}%).",
                metric=f"{sp.close_rate}% vs {avg_close_rate:.1f}% avg",
                action=f"Schedule 1:1 coaching session with {sp.display_name} to review deal qualification and closing techniques.",
            ))

        if sp.activities_per_lead < 5:
            recommendations.append(RecommendationItem(
                category="coaching",
                priority="medium",
                title=f"Low activity: {sp.display_name}",
                description=f"{sp.display_name} averages only {sp.activities_per_lead} activities per lead.",
                metric=f"{sp.activities_per_lead} activities/lead",
                action="Encourage more touchpoints per lead - aim for 8-12 activities before closing.",
            ))

        if sp.quota_attainment < 50 and sp.quota > 0:
            recommendations.append(RecommendationItem(
                category="sales",
                priority="high",
                title=f"Quota risk: {sp.display_name}",
                description=f"{sp.display_name} is at {sp.quota_attainment:.0f}% of quota.",
                metric=f"${sp.total_revenue:,.0f} / ${sp.quota:,.0f}",
                action="Review pipeline and identify quick-win opportunities to accelerate.",
            ))

    # Analyze lead sources
    for source in source_metrics:
        if source.close_rate > avg_close_rate * 1.3 and source.total_leads < 100:
            recommendations.append(RecommendationItem(
                category="marketing",
                priority="high",
                title=f"Scale high-performing channel: {source.source}",
                description=f"{source.source} has {source.close_rate}% close rate but only {source.total_leads} leads.",
                metric=f"{source.close_rate}% close rate",
                action=f"Increase budget/effort for {source.source} - this channel converts {source.close_rate - avg_close_rate:.1f}% better than average.",
            ))

        if source.close_rate < avg_close_rate * 0.5 and source.total_leads > 50:
            recommendations.append(RecommendationItem(
                category="marketing",
                priority="medium",
                title=f"Review low-converting channel: {source.source}",
                description=f"{source.source} has only {source.close_rate}% close rate with {source.total_leads} leads.",
                metric=f"{source.close_rate}% close rate",
                action=f"Evaluate lead quality from {source.source} or consider reducing spend.",
            ))

        if source.avg_deal_size > sum(s.avg_deal_size for s in source_metrics) / len(source_metrics) * 1.5:
            recommendations.append(RecommendationItem(
                category="sales",
                priority="medium",
                title=f"High-value source: {source.source}",
                description=f"Leads from {source.source} have ${source.avg_deal_size:,.0f} avg deal size.",
                metric=f"${source.avg_deal_size:,.0f} avg deal",
                action="Prioritize leads from this source for senior reps.",
            ))

    # Pipeline health
    now = datetime.utcnow()
    stale_leads = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.status.in_([
            models.LEAD_STATUS_CONTACTED,
            models.LEAD_STATUS_QUALIFIED,
            models.LEAD_STATUS_PROPOSAL,
        ]),
        models.Lead.updated_at < now - timedelta(days=14),
    ).count()

    if stale_leads > 10:
        recommendations.append(RecommendationItem(
            category="pipeline",
            priority="high",
            title="Stale pipeline alert",
            description=f"{stale_leads} leads haven't been updated in 14+ days.",
            metric=f"{stale_leads} stale leads",
            action="Review and update or close stale opportunities to maintain accurate forecasting.",
        ))

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda x: priority_order.get(x.priority, 2))

    return recommendations


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/kpis", response_model=TeamKPISummary)
def get_team_kpis(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    days: int = Query(default=30, ge=7, le=1095),
    start_date: Optional[str] = Query(default=None, description="Start date YYYY-MM-DD"),
    end_date_param: Optional[str] = Query(default=None, alias="end_date", description="End date YYYY-MM-DD"),
):
    """Get team KPI summary for the specified period."""

    # Use custom date range if provided, otherwise use days
    if start_date and end_date_param:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date_param, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            start = datetime.utcnow() - timedelta(days=days)
            end = datetime.utcnow()
    else:
        end = datetime.utcnow()
        start = end - timedelta(days=days)

    org_id = user.organization_id
    start_date = start
    end_date = end

    # Get salespeople KPIs
    salespeople = get_salesperson_kpis(db, org_id, start_date, end_date)

    # Calculate team totals
    leads_query = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.created_at >= start_date,
        models.Lead.created_at <= end_date,
    )

    total_leads = leads_query.count()
    total_won = leads_query.filter(models.Lead.status == models.LEAD_STATUS_WON).count()
    total_lost = leads_query.filter(models.Lead.status == models.LEAD_STATUS_LOST).count()
    total_pipeline = total_leads - total_won - total_lost
    team_close_rate = total_won / max(total_won + total_lost, 1)

    # Revenue
    revenue = db.query(func.sum(models.Lead.deal_value)).filter(
        models.Lead.organization_id == org_id,
        models.Lead.status == models.LEAD_STATUS_WON,
        models.Lead.closed_at >= start_date,
        models.Lead.closed_at <= end_date,
    ).scalar() or Decimal("0")

    total_revenue = float(revenue)
    avg_deal_size = total_revenue / max(total_won, 1)

    # Activities
    activities_query = db.query(models.LeadActivity).filter(
        models.LeadActivity.organization_id == org_id,
        models.LeadActivity.activity_at >= start_date,
        models.LeadActivity.activity_at <= end_date,
    )

    total_calls = activities_query.filter(
        models.LeadActivity.activity_type == models.ACTIVITY_CALL
    ).count()
    total_emails = activities_query.filter(
        models.LeadActivity.activity_type == models.ACTIVITY_EMAIL
    ).count()
    total_meetings = activities_query.filter(
        models.LeadActivity.activity_type == models.ACTIVITY_MEETING
    ).count()

    return TeamKPISummary(
        period_start=start_date,
        period_end=end_date,
        total_leads=total_leads,
        total_won=total_won,
        total_lost=total_lost,
        total_pipeline=total_pipeline,
        team_close_rate=round(team_close_rate * 100, 1),
        total_revenue=round(total_revenue, 2),
        avg_deal_size=round(avg_deal_size, 2),
        total_calls=total_calls,
        total_emails=total_emails,
        total_meetings=total_meetings,
        salespeople=salespeople,
    )


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    start_date: Optional[str] = Query(default=None, description="Start date YYYY-MM-DD"),
    end_date_param: Optional[str] = Query(default=None, alias="end_date", description="End date YYYY-MM-DD"),
):
    """Get comprehensive dashboard metrics."""

    org_id = user.organization_id
    now = datetime.utcnow()

    # Parse custom date range if provided
    custom_start = None
    custom_end = None
    if start_date and end_date_param:
        try:
            custom_start = datetime.strptime(start_date, "%Y-%m-%d")
            custom_end = datetime.strptime(end_date_param, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            pass

    # Current month
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # All time totals
    total_leads = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id
    ).count()

    total_won = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.status == models.LEAD_STATUS_WON,
    ).count()

    total_closed = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.status.in_([models.LEAD_STATUS_WON, models.LEAD_STATUS_LOST]),
    ).count()

    overall_close_rate = total_won / max(total_closed, 1) * 100

    total_revenue = float(db.query(func.sum(models.Lead.deal_value)).filter(
        models.Lead.organization_id == org_id,
        models.Lead.status == models.LEAD_STATUS_WON,
    ).scalar() or 0)

    avg_deal_size = total_revenue / max(total_won, 1)

    # This month vs last month
    leads_this_month = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.created_at >= month_start,
    ).count()

    leads_last_month = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.created_at >= last_month_start,
        models.Lead.created_at < month_start,
    ).count()

    leads_change_pct = ((leads_this_month - leads_last_month) / max(leads_last_month, 1)) * 100

    revenue_this_month = float(db.query(func.sum(models.Lead.deal_value)).filter(
        models.Lead.organization_id == org_id,
        models.Lead.status == models.LEAD_STATUS_WON,
        models.Lead.closed_at >= month_start,
    ).scalar() or 0)

    revenue_last_month = float(db.query(func.sum(models.Lead.deal_value)).filter(
        models.Lead.organization_id == org_id,
        models.Lead.status == models.LEAD_STATUS_WON,
        models.Lead.closed_at >= last_month_start,
        models.Lead.closed_at < month_start,
    ).scalar() or 0)

    revenue_change_pct = ((revenue_this_month - revenue_last_month) / max(revenue_last_month, 1)) * 100

    # Pipeline by status
    pipeline = []
    pipeline_value = 0
    for status in models.LEAD_STATUSES:
        count = db.query(models.Lead).filter(
            models.Lead.organization_id == org_id,
            models.Lead.status == status,
        ).count()

        value = float(db.query(func.sum(models.Lead.deal_value)).filter(
            models.Lead.organization_id == org_id,
            models.Lead.status == status,
        ).scalar() or 0)

        pipeline.append(PipelineMetrics(
            status=status,
            count=count,
            total_value=round(value, 2),
            avg_value=round(value / max(count, 1), 2),
        ))

        if status not in [models.LEAD_STATUS_WON, models.LEAD_STATUS_LOST]:
            pipeline_value += value

    # By source (last 90 days)
    source_start = now - timedelta(days=90)
    by_source = get_source_metrics(db, org_id, source_start, now)

    # Activity trends (last 7 days)
    activities_by_day = []
    for i in range(7):
        day = now - timedelta(days=6-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        calls = db.query(models.LeadActivity).filter(
            models.LeadActivity.organization_id == org_id,
            models.LeadActivity.activity_type == models.ACTIVITY_CALL,
            models.LeadActivity.activity_at >= day_start,
            models.LeadActivity.activity_at < day_end,
        ).count()

        emails = db.query(models.LeadActivity).filter(
            models.LeadActivity.organization_id == org_id,
            models.LeadActivity.activity_type == models.ACTIVITY_EMAIL,
            models.LeadActivity.activity_at >= day_start,
            models.LeadActivity.activity_at < day_end,
        ).count()

        meetings = db.query(models.LeadActivity).filter(
            models.LeadActivity.organization_id == org_id,
            models.LeadActivity.activity_type == models.ACTIVITY_MEETING,
            models.LeadActivity.activity_at >= day_start,
            models.LeadActivity.activity_at < day_end,
        ).count()

        activities_by_day.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "calls": calls,
            "emails": emails,
            "meetings": meetings,
        })

    # Top performers (last 30 days)
    kpi_start = now - timedelta(days=30)
    top_performers = get_salesperson_kpis(db, org_id, kpi_start, now)[:5]

    return DashboardMetrics(
        total_leads=total_leads,
        total_revenue=round(total_revenue, 2),
        avg_deal_size=round(avg_deal_size, 2),
        overall_close_rate=round(overall_close_rate, 1),
        leads_this_month=leads_this_month,
        leads_last_month=leads_last_month,
        leads_change_pct=round(leads_change_pct, 1),
        revenue_this_month=round(revenue_this_month, 2),
        revenue_last_month=round(revenue_last_month, 2),
        revenue_change_pct=round(revenue_change_pct, 1),
        pipeline=pipeline,
        pipeline_value=round(pipeline_value, 2),
        by_source=by_source,
        activities_by_day=activities_by_day,
        top_performers=top_performers,
    )


@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get AI-powered sales and marketing recommendations."""

    org_id = user.organization_id
    now = datetime.utcnow()
    start_date = now - timedelta(days=90)

    # Get data for analysis
    salespeople_kpis = get_salesperson_kpis(db, org_id, start_date, now)
    source_metrics = get_source_metrics(db, org_id, start_date, now)

    # Generate recommendations
    recommendations = generate_recommendations(db, org_id, salespeople_kpis, source_metrics)

    return RecommendationsResponse(
        generated_at=now,
        recommendations=recommendations,
    )


@router.get("/salesperson/{user_id}", response_model=SalespersonKPI)
def get_salesperson_detail(
    user_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    days: int = Query(default=30, ge=7, le=365),
):
    """Get detailed KPIs for a specific salesperson."""

    # Verify salesperson belongs to same org
    sp = db.query(models.Salesperson).filter(
        models.Salesperson.user_id == user_id,
        models.Salesperson.organization_id == user.organization_id,
    ).first()

    if not sp:
        raise HTTPException(status_code=404, detail="Salesperson not found")

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    kpis = get_salesperson_kpis(db, user.organization_id, start_date, end_date)

    for kpi in kpis:
        if kpi.user_id == user_id:
            return kpi

    raise HTTPException(status_code=404, detail="Salesperson KPIs not found")


@router.get("/utm-breakdown", response_model=UTMBreakdown)
def get_utm_breakdown(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    days: int = Query(default=90, ge=7, le=365, description="Number of days to analyze"),
):
    """Get breakdown of leads by UTM source, medium, and campaign."""

    org_id = user.organization_id
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Base query for date range
    base_filter = and_(
        models.Lead.organization_id == org_id,
        models.Lead.created_at >= start_date,
        models.Lead.created_at <= end_date,
    )

    # Total leads in period
    total_leads = db.query(func.count(models.Lead.id)).filter(base_filter).scalar() or 0

    # Count by UTM source
    utm_sources_query = db.query(
        models.Lead.utm_source,
        func.count(models.Lead.id).label("count")
    ).filter(
        base_filter,
        models.Lead.utm_source.isnot(None),
        models.Lead.utm_source != "",
    ).group_by(models.Lead.utm_source).order_by(func.count(models.Lead.id).desc()).limit(10).all()

    utm_sources = [{"name": s[0], "count": s[1]} for s in utm_sources_query]

    # Count by UTM medium
    utm_mediums_query = db.query(
        models.Lead.utm_medium,
        func.count(models.Lead.id).label("count")
    ).filter(
        base_filter,
        models.Lead.utm_medium.isnot(None),
        models.Lead.utm_medium != "",
    ).group_by(models.Lead.utm_medium).order_by(func.count(models.Lead.id).desc()).limit(10).all()

    utm_mediums = [{"name": m[0], "count": m[1]} for m in utm_mediums_query]

    # Count by UTM campaign
    utm_campaigns_query = db.query(
        models.Lead.utm_campaign,
        func.count(models.Lead.id).label("count")
    ).filter(
        base_filter,
        models.Lead.utm_campaign.isnot(None),
        models.Lead.utm_campaign != "",
    ).group_by(models.Lead.utm_campaign).order_by(func.count(models.Lead.id).desc()).limit(10).all()

    utm_campaigns = [{"name": c[0], "count": c[1]} for c in utm_campaigns_query]

    # Count leads with any UTM data
    total_with_utm = db.query(func.count(models.Lead.id)).filter(
        base_filter,
        (models.Lead.utm_source.isnot(None) & (models.Lead.utm_source != "")) |
        (models.Lead.utm_medium.isnot(None) & (models.Lead.utm_medium != "")) |
        (models.Lead.utm_campaign.isnot(None) & (models.Lead.utm_campaign != ""))
    ).scalar() or 0

    return UTMBreakdown(
        utm_sources=utm_sources,
        utm_mediums=utm_mediums,
        utm_campaigns=utm_campaigns,
        total_with_utm=total_with_utm,
        total_leads=total_leads,
    )
