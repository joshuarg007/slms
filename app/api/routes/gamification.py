# app/api/routes/gamification.py
"""Gamification API routes - Leaderboards, Badges, and Competitions."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db import models
from app.db.session import SessionLocal

router = APIRouter(prefix="/gamification", tags=["Gamification"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# Response Models
# ============================================================================

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    display_name: str
    email: str
    avatar_color: str  # For generating avatar backgrounds
    value: float
    change: int  # Position change from previous period
    streak: int  # Days on leaderboard top 3


class LeaderboardResponse(BaseModel):
    metric: str
    metric_label: str
    period: str
    period_label: str
    entries: list[LeaderboardEntry]
    total_participants: int
    last_updated: datetime


class Badge(BaseModel):
    id: str
    name: str
    description: str
    icon: str  # Icon name
    color: str  # Badge color
    earned_at: Optional[datetime] = None
    progress: Optional[float] = None  # 0-100 for in-progress badges


class UserBadges(BaseModel):
    user_id: int
    display_name: str
    earned_badges: list[Badge]
    in_progress_badges: list[Badge]
    total_points: int


class CompetitionEntry(BaseModel):
    user_id: int
    display_name: str
    avatar_color: str
    score: float
    rank: int


class Competition(BaseModel):
    id: str
    name: str
    description: str
    metric: str
    start_date: datetime
    end_date: datetime
    status: str  # "active", "upcoming", "completed"
    entries: list[CompetitionEntry]
    prize: Optional[str] = None


class GamificationOverview(BaseModel):
    current_rank: int
    total_participants: int
    points_this_month: int
    badges_earned: int
    active_competitions: int
    streak_days: int


# ============================================================================
# Badge Definitions
# ============================================================================

BADGE_DEFINITIONS = [
    {
        "id": "first_sale",
        "name": "First Sale",
        "description": "Close your first deal",
        "icon": "trophy",
        "color": "yellow",
        "check": lambda stats: stats["won_leads"] >= 1,
        "progress": lambda stats: min(stats["won_leads"] / 1 * 100, 100),
    },
    {
        "id": "closer_10",
        "name": "Closer",
        "description": "Close 10 deals",
        "icon": "check-circle",
        "color": "green",
        "check": lambda stats: stats["won_leads"] >= 10,
        "progress": lambda stats: min(stats["won_leads"] / 10 * 100, 100),
    },
    {
        "id": "closer_50",
        "name": "Deal Machine",
        "description": "Close 50 deals",
        "icon": "lightning-bolt",
        "color": "purple",
        "check": lambda stats: stats["won_leads"] >= 50,
        "progress": lambda stats: min(stats["won_leads"] / 50 * 100, 100),
    },
    {
        "id": "revenue_10k",
        "name": "10K Club",
        "description": "Generate $10,000 in revenue",
        "icon": "currency-dollar",
        "color": "blue",
        "check": lambda stats: stats["total_revenue"] >= 10000,
        "progress": lambda stats: min(stats["total_revenue"] / 10000 * 100, 100),
    },
    {
        "id": "revenue_100k",
        "name": "100K Club",
        "description": "Generate $100,000 in revenue",
        "icon": "star",
        "color": "gold",
        "check": lambda stats: stats["total_revenue"] >= 100000,
        "progress": lambda stats: min(stats["total_revenue"] / 100000 * 100, 100),
    },
    {
        "id": "activity_100",
        "name": "Hustler",
        "description": "Log 100 activities",
        "icon": "fire",
        "color": "orange",
        "check": lambda stats: stats["total_activities"] >= 100,
        "progress": lambda stats: min(stats["total_activities"] / 100 * 100, 100),
    },
    {
        "id": "activity_500",
        "name": "Workaholic",
        "description": "Log 500 activities",
        "icon": "fire",
        "color": "red",
        "check": lambda stats: stats["total_activities"] >= 500,
        "progress": lambda stats: min(stats["total_activities"] / 500 * 100, 100),
    },
    {
        "id": "close_rate_30",
        "name": "Sharpshooter",
        "description": "Achieve 30% close rate (min 10 leads)",
        "icon": "target",
        "color": "teal",
        "check": lambda stats: stats["close_rate"] >= 30 and stats["total_closed"] >= 10,
        "progress": lambda stats: min(stats["close_rate"] / 30 * 100, 100) if stats["total_closed"] >= 10 else 0,
    },
    {
        "id": "quota_buster",
        "name": "Quota Buster",
        "description": "Exceed monthly quota by 20%",
        "icon": "trending-up",
        "color": "emerald",
        "check": lambda stats: stats["quota_attainment"] >= 120,
        "progress": lambda stats: min(stats["quota_attainment"] / 120 * 100, 100),
    },
    {
        "id": "big_deal",
        "name": "Whale Hunter",
        "description": "Close a deal worth $25,000+",
        "icon": "sparkles",
        "color": "indigo",
        "check": lambda stats: stats["max_deal"] >= 25000,
        "progress": lambda stats: min(stats["max_deal"] / 25000 * 100, 100),
    },
]


# ============================================================================
# Helper Functions
# ============================================================================

def get_avatar_color(user_id: int) -> str:
    """Generate consistent avatar color based on user ID."""
    colors = [
        "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
        "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500",
    ]
    return colors[user_id % len(colors)]


def get_user_stats(db: Session, user_id: int, org_id: int, start_date: datetime, end_date: datetime) -> dict:
    """Get comprehensive stats for a user."""

    leads_query = db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.assigned_user_id == user_id,
    )

    won_leads = leads_query.filter(
        models.Lead.status == models.LEAD_STATUS_WON,
        models.Lead.closed_at >= start_date,
        models.Lead.closed_at <= end_date,
    ).count()

    lost_leads = leads_query.filter(
        models.Lead.status == models.LEAD_STATUS_LOST,
        models.Lead.closed_at >= start_date,
        models.Lead.closed_at <= end_date,
    ).count()

    total_closed = won_leads + lost_leads
    close_rate = (won_leads / max(total_closed, 1)) * 100

    revenue_result = db.query(func.sum(models.Lead.deal_value)).filter(
        models.Lead.organization_id == org_id,
        models.Lead.assigned_user_id == user_id,
        models.Lead.status == models.LEAD_STATUS_WON,
        models.Lead.closed_at >= start_date,
        models.Lead.closed_at <= end_date,
    ).scalar() or Decimal("0")

    max_deal = db.query(func.max(models.Lead.deal_value)).filter(
        models.Lead.organization_id == org_id,
        models.Lead.assigned_user_id == user_id,
        models.Lead.status == models.LEAD_STATUS_WON,
    ).scalar() or Decimal("0")

    total_activities = db.query(models.LeadActivity).filter(
        models.LeadActivity.organization_id == org_id,
        models.LeadActivity.user_id == user_id,
        models.LeadActivity.activity_at >= start_date,
        models.LeadActivity.activity_at <= end_date,
    ).count()

    # Get quota
    sp = db.query(models.Salesperson).filter(
        models.Salesperson.user_id == user_id,
        models.Salesperson.organization_id == org_id,
    ).first()

    quota = float(sp.monthly_quota or 0) if sp else 0
    quota_attainment = (float(revenue_result) / quota * 100) if quota > 0 else 0

    return {
        "won_leads": won_leads,
        "lost_leads": lost_leads,
        "total_closed": total_closed,
        "close_rate": close_rate,
        "total_revenue": float(revenue_result),
        "max_deal": float(max_deal),
        "total_activities": total_activities,
        "quota": quota,
        "quota_attainment": quota_attainment,
    }


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    metric: str = Query(default="revenue", enum=["revenue", "deals", "activities", "close_rate"]),
    period: str = Query(default="month", enum=["week", "month", "quarter", "year"]),
):
    """Get leaderboard for specified metric and period."""

    org_id = user.organization_id
    now = datetime.utcnow()

    # Calculate date range
    if period == "week":
        start_date = now - timedelta(days=7)
        period_label = "This Week"
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_label = "This Month"
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start_date = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        period_label = "This Quarter"
    else:  # year
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        period_label = "This Year"

    end_date = now

    # Get all salespeople
    salespeople = db.query(models.Salesperson).filter(
        models.Salesperson.organization_id == org_id,
        models.Salesperson.is_active == True,
    ).all()

    # Calculate metrics for each
    entries_data = []
    for sp in salespeople:
        stats = get_user_stats(db, sp.user_id, org_id, start_date, end_date)

        if metric == "revenue":
            value = stats["total_revenue"]
            metric_label = "Revenue"
        elif metric == "deals":
            value = stats["won_leads"]
            metric_label = "Deals Closed"
        elif metric == "activities":
            value = stats["total_activities"]
            metric_label = "Activities"
        else:  # close_rate
            value = stats["close_rate"] if stats["total_closed"] >= 5 else 0
            metric_label = "Close Rate"

        entries_data.append({
            "user_id": sp.user_id,
            "display_name": sp.display_name,
            "email": sp.user.email,
            "value": value,
        })

    # Sort and rank
    entries_data.sort(key=lambda x: x["value"], reverse=True)

    entries = []
    for idx, entry in enumerate(entries_data):
        entries.append(LeaderboardEntry(
            rank=idx + 1,
            user_id=entry["user_id"],
            display_name=entry["display_name"],
            email=entry["email"],
            avatar_color=get_avatar_color(entry["user_id"]),
            value=round(entry["value"], 2),
            change=0,  # TODO: Compare with previous period
            streak=0,  # TODO: Calculate streak
        ))

    return LeaderboardResponse(
        metric=metric,
        metric_label=metric_label,
        period=period,
        period_label=period_label,
        entries=entries,
        total_participants=len(entries),
        last_updated=now,
    )


@router.get("/badges/{user_id}", response_model=UserBadges)
def get_user_badges(
    user_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get badges for a specific user."""

    org_id = user.organization_id

    # Verify user belongs to org
    sp = db.query(models.Salesperson).filter(
        models.Salesperson.user_id == user_id,
        models.Salesperson.organization_id == org_id,
    ).first()

    if not sp:
        # Return empty if not found
        return UserBadges(
            user_id=user_id,
            display_name="Unknown",
            earned_badges=[],
            in_progress_badges=[],
            total_points=0,
        )

    # Get all-time stats for badges
    start_date = datetime(2000, 1, 1)
    end_date = datetime.utcnow()
    stats = get_user_stats(db, user_id, org_id, start_date, end_date)

    earned_badges = []
    in_progress_badges = []

    for badge_def in BADGE_DEFINITIONS:
        badge = Badge(
            id=badge_def["id"],
            name=badge_def["name"],
            description=badge_def["description"],
            icon=badge_def["icon"],
            color=badge_def["color"],
        )

        if badge_def["check"](stats):
            badge.earned_at = datetime.utcnow()  # TODO: Track actual earn date
            earned_badges.append(badge)
        else:
            badge.progress = badge_def["progress"](stats)
            if badge.progress > 0:
                in_progress_badges.append(badge)

    # Sort in-progress by progress descending
    in_progress_badges.sort(key=lambda x: x.progress or 0, reverse=True)

    # Calculate points (10 points per badge)
    total_points = len(earned_badges) * 10

    return UserBadges(
        user_id=user_id,
        display_name=sp.display_name,
        earned_badges=earned_badges,
        in_progress_badges=in_progress_badges[:5],  # Top 5 in progress
        total_points=total_points,
    )


@router.get("/my-badges", response_model=UserBadges)
def get_my_badges(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get badges for the current user."""
    return get_user_badges(user.id, db, user)


@router.get("/overview", response_model=GamificationOverview)
def get_gamification_overview(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get gamification overview for the current user."""

    org_id = user.organization_id
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get user's rank in revenue this month
    salespeople = db.query(models.Salesperson).filter(
        models.Salesperson.organization_id == org_id,
        models.Salesperson.is_active == True,
    ).all()

    revenues = []
    for sp in salespeople:
        rev = db.query(func.sum(models.Lead.deal_value)).filter(
            models.Lead.organization_id == org_id,
            models.Lead.assigned_user_id == sp.user_id,
            models.Lead.status == models.LEAD_STATUS_WON,
            models.Lead.closed_at >= month_start,
        ).scalar() or Decimal("0")
        revenues.append((sp.user_id, float(rev)))

    revenues.sort(key=lambda x: x[1], reverse=True)
    current_rank = next((i + 1 for i, (uid, _) in enumerate(revenues) if uid == user.id), 0)

    # Get badges count
    badges_data = get_my_badges(db, user)

    # Calculate points this month (simplified: revenue / 100)
    user_revenue = next((rev for uid, rev in revenues if uid == user.id), 0)
    points_this_month = int(user_revenue / 100)

    return GamificationOverview(
        current_rank=current_rank,
        total_participants=len(revenues),
        points_this_month=points_this_month,
        badges_earned=len(badges_data.earned_badges),
        active_competitions=0,  # TODO: Implement competitions
        streak_days=0,  # TODO: Track streaks
    )
