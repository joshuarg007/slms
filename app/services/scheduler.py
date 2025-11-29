"""
Scheduled tasks for Site2CRM

Handles:
- Daily digest emails (sent at 8am UTC)
- Weekly digest emails (sent Monday 8am UTC)
- Salesperson digest emails (sent with weekly digest if enabled)
"""
import logging
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db import models
from app.services.email import (
    send_daily_digest,
    send_weekly_digest,
    send_salesperson_digest,
)

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the global scheduler instance."""
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler


def start_scheduler():
    """Start the scheduler with all scheduled jobs."""
    sched = get_scheduler()

    if sched.running:
        logger.info("Scheduler already running")
        return

    # Daily digest: 8am UTC every day
    sched.add_job(
        run_daily_digest,
        CronTrigger(hour=8, minute=0),
        id="daily_digest",
        name="Daily Lead Digest",
        replace_existing=True,
    )

    # Weekly digest: Monday 8am UTC
    sched.add_job(
        run_weekly_digest,
        CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="weekly_digest",
        name="Weekly Lead Digest",
        replace_existing=True,
    )

    # Salesperson digest: Monday 8:30am UTC (after weekly digest)
    sched.add_job(
        run_salesperson_digest,
        CronTrigger(day_of_week="mon", hour=8, minute=30),
        id="salesperson_digest",
        name="Salesperson Performance Digest",
        replace_existing=True,
    )

    sched.start()
    logger.info("Scheduler started with digest jobs")


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")


# =============================================================================
# Digest Generation Functions
# =============================================================================

def _get_org_notification_settings(db: Session, org_id: int) -> Optional[models.NotificationSettings]:
    """Get notification settings for an organization."""
    return db.query(models.NotificationSettings).filter(
        models.NotificationSettings.organization_id == org_id
    ).first()


def _get_org_users_emails(db: Session, org_id: int) -> list:
    """Get email addresses for all users in an organization."""
    users = db.query(models.User).filter(
        models.User.organization_id == org_id
    ).all()
    return [u.email for u in users if u.email]


def _get_leads_in_period(db: Session, org_id: int, start: datetime, end: datetime) -> list:
    """Get leads created within a time period."""
    return db.query(models.Lead).filter(
        models.Lead.organization_id == org_id,
        models.Lead.created_at >= start,
        models.Lead.created_at < end,
    ).order_by(models.Lead.created_at.desc()).all()


def _aggregate_leads_by_source(leads: list) -> dict:
    """Count leads by source."""
    by_source = defaultdict(int)
    for lead in leads:
        source = lead.source or "Unknown"
        by_source[source] += 1
    return dict(by_source)


def _aggregate_leads_by_day(leads: list) -> dict:
    """Count leads by day (for weekly report)."""
    by_day = defaultdict(int)
    for lead in leads:
        if lead.created_at:
            day_label = lead.created_at.strftime("%a")  # Mon, Tue, etc.
            by_day[day_label] += 1

    # Ensure all days are present in order
    days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    ordered = {}
    for day in days_order:
        ordered[day] = by_day.get(day, 0)
    return ordered


def _leads_to_dicts(leads: list) -> list:
    """Convert lead models to dicts for email templates."""
    return [
        {
            "name": lead.name or f"{lead.first_name or ''} {lead.last_name or ''}".strip() or "Unknown",
            "email": lead.email,
            "source": lead.source or "Unknown",
            "company": lead.company,
        }
        for lead in leads
    ]


# =============================================================================
# Scheduled Job Functions
# =============================================================================

async def run_daily_digest():
    """Send daily digest emails to all organizations with the setting enabled."""
    logger.info("Running daily digest job")

    db = SessionLocal()
    try:
        # Get all organizations
        orgs = db.query(models.Organization).all()

        now = datetime.utcnow()
        period_end = now
        period_start = now - timedelta(hours=24)

        for org in orgs:
            try:
                # Check if daily digest is enabled
                settings = _get_org_notification_settings(db, org.id)
                if settings and not settings.daily_digest:
                    continue
                elif settings is None:
                    # Default is OFF for daily digest
                    continue

                # Get recipients
                recipients = _get_org_users_emails(db, org.id)
                if not recipients:
                    continue

                # Get leads from last 24 hours
                leads = _get_leads_in_period(db, org.id, period_start, period_end)

                # Aggregate data
                leads_by_source = _aggregate_leads_by_source(leads)
                top_leads = _leads_to_dicts(leads[:10])

                # Send email
                send_daily_digest(
                    recipients=recipients,
                    organization_name=org.name,
                    total_leads=len(leads),
                    leads_by_source=leads_by_source,
                    top_leads=top_leads,
                    period_start=period_start.strftime("%b %d, %Y %H:%M UTC"),
                    period_end=period_end.strftime("%b %d, %Y %H:%M UTC"),
                )

                logger.info(f"Sent daily digest to org {org.id} ({len(leads)} leads)")

            except Exception as e:
                logger.error(f"Error sending daily digest to org {org.id}: {e}")

    finally:
        db.close()

    logger.info("Daily digest job completed")


async def run_weekly_digest():
    """Send weekly digest emails to all organizations with the setting enabled."""
    logger.info("Running weekly digest job")

    db = SessionLocal()
    try:
        orgs = db.query(models.Organization).all()

        now = datetime.utcnow()
        period_end = now
        period_start = now - timedelta(days=7)

        # For comparison: previous week
        prev_period_end = period_start
        prev_period_start = prev_period_end - timedelta(days=7)

        for org in orgs:
            try:
                # Check if weekly digest is enabled (default ON)
                settings = _get_org_notification_settings(db, org.id)
                if settings and not settings.weekly_digest:
                    continue
                # If no settings, default is ON for weekly

                recipients = _get_org_users_emails(db, org.id)
                if not recipients:
                    continue

                # Get leads from last 7 days
                leads = _get_leads_in_period(db, org.id, period_start, period_end)
                prev_leads = _get_leads_in_period(db, org.id, prev_period_start, prev_period_end)

                # Calculate comparison
                comparison_change = None
                if len(prev_leads) > 0:
                    change = ((len(leads) - len(prev_leads)) / len(prev_leads)) * 100
                    comparison_change = int(round(change))
                elif len(leads) > 0:
                    comparison_change = 100  # Infinite increase, show as 100%

                # Aggregate data
                leads_by_source = _aggregate_leads_by_source(leads)
                leads_by_day = _aggregate_leads_by_day(leads)
                top_leads = _leads_to_dicts(leads[:10])

                # Send email
                send_weekly_digest(
                    recipients=recipients,
                    organization_name=org.name,
                    total_leads=len(leads),
                    leads_by_source=leads_by_source,
                    leads_by_day=leads_by_day,
                    top_leads=top_leads,
                    period_start=period_start.strftime("%b %d, %Y"),
                    period_end=period_end.strftime("%b %d, %Y"),
                    comparison_change=comparison_change,
                )

                logger.info(f"Sent weekly digest to org {org.id} ({len(leads)} leads)")

            except Exception as e:
                logger.error(f"Error sending weekly digest to org {org.id}: {e}")

    finally:
        db.close()

    logger.info("Weekly digest job completed")


async def run_salesperson_digest():
    """Send salesperson performance digest to organizations with the setting enabled."""
    logger.info("Running salesperson digest job")

    db = SessionLocal()
    try:
        orgs = db.query(models.Organization).all()

        now = datetime.utcnow()
        period_start = now - timedelta(days=7)
        period_label = f"{period_start.strftime('%b %d')} - {now.strftime('%b %d, %Y')}"

        for org in orgs:
            try:
                # Check if salesperson digest is enabled (default OFF)
                settings = _get_org_notification_settings(db, org.id)
                if settings is None or not settings.salesperson_digest:
                    continue

                recipients = _get_org_users_emails(db, org.id)
                if not recipients:
                    continue

                # Get salesperson stats from the database
                stats = db.query(models.SalespersonDailyStats).filter(
                    models.SalespersonDailyStats.organization_id == org.id,
                    models.SalespersonDailyStats.stats_date >= period_start.date(),
                ).all()

                # Aggregate stats by salesperson
                salespeople = {}
                for stat in stats:
                    owner_id = stat.owner_id
                    if owner_id not in salespeople:
                        salespeople[owner_id] = {
                            "name": stat.owner_name or stat.owner_email or owner_id,
                            "email": stat.owner_email or "",
                            "emails_count": 0,
                            "calls_count": 0,
                            "meetings_count": 0,
                            "new_deals_count": 0,
                        }
                    salespeople[owner_id]["emails_count"] += stat.emails_count or 0
                    salespeople[owner_id]["calls_count"] += stat.calls_count or 0
                    salespeople[owner_id]["meetings_count"] += stat.meetings_count or 0
                    salespeople[owner_id]["new_deals_count"] += stat.new_deals_count or 0

                salespeople_list = list(salespeople.values())

                if not salespeople_list:
                    logger.info(f"No salesperson stats for org {org.id}, skipping")
                    continue

                # Sort by deals (descending)
                salespeople_list.sort(key=lambda x: -x["new_deals_count"])

                # Send email
                send_salesperson_digest(
                    recipients=recipients,
                    organization_name=org.name,
                    period_label=period_label,
                    salespeople_stats=salespeople_list,
                )

                logger.info(f"Sent salesperson digest to org {org.id} ({len(salespeople_list)} salespeople)")

            except Exception as e:
                logger.error(f"Error sending salesperson digest to org {org.id}: {e}")

    finally:
        db.close()

    logger.info("Salesperson digest job completed")


# =============================================================================
# Manual Trigger Functions (for testing/admin use)
# =============================================================================

async def trigger_daily_digest_for_org(org_id: int):
    """Manually trigger daily digest for a specific organization."""
    db = SessionLocal()
    try:
        org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
        if not org:
            return {"error": "Organization not found"}

        recipients = _get_org_users_emails(db, org_id)
        if not recipients:
            return {"error": "No recipients"}

        now = datetime.utcnow()
        period_end = now
        period_start = now - timedelta(hours=24)

        leads = _get_leads_in_period(db, org_id, period_start, period_end)
        leads_by_source = _aggregate_leads_by_source(leads)
        top_leads = _leads_to_dicts(leads[:10])

        success = send_daily_digest(
            recipients=recipients,
            organization_name=org.name,
            total_leads=len(leads),
            leads_by_source=leads_by_source,
            top_leads=top_leads,
            period_start=period_start.strftime("%b %d, %Y %H:%M UTC"),
            period_end=period_end.strftime("%b %d, %Y %H:%M UTC"),
        )

        return {"success": success, "leads_count": len(leads), "recipients": recipients}

    finally:
        db.close()


async def trigger_weekly_digest_for_org(org_id: int):
    """Manually trigger weekly digest for a specific organization."""
    db = SessionLocal()
    try:
        org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
        if not org:
            return {"error": "Organization not found"}

        recipients = _get_org_users_emails(db, org_id)
        if not recipients:
            return {"error": "No recipients"}

        now = datetime.utcnow()
        period_end = now
        period_start = now - timedelta(days=7)
        prev_period_end = period_start
        prev_period_start = prev_period_end - timedelta(days=7)

        leads = _get_leads_in_period(db, org_id, period_start, period_end)
        prev_leads = _get_leads_in_period(db, org_id, prev_period_start, prev_period_end)

        comparison_change = None
        if len(prev_leads) > 0:
            change = ((len(leads) - len(prev_leads)) / len(prev_leads)) * 100
            comparison_change = int(round(change))
        elif len(leads) > 0:
            comparison_change = 100

        leads_by_source = _aggregate_leads_by_source(leads)
        leads_by_day = _aggregate_leads_by_day(leads)
        top_leads = _leads_to_dicts(leads[:10])

        success = send_weekly_digest(
            recipients=recipients,
            organization_name=org.name,
            total_leads=len(leads),
            leads_by_source=leads_by_source,
            leads_by_day=leads_by_day,
            top_leads=top_leads,
            period_start=period_start.strftime("%b %d, %Y"),
            period_end=period_end.strftime("%b %d, %Y"),
            comparison_change=comparison_change,
        )

        return {"success": success, "leads_count": len(leads), "recipients": recipients}

    finally:
        db.close()
