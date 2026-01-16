#!/usr/bin/env python3
"""Seed demo data for G2 screenshots."""

import random
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent to path for imports
import sys
import os

# Detect if we're on production or local
if os.path.exists("/opt/site2crm"):
    sys.path.insert(0, "/opt/site2crm")
else:
    sys.path.insert(0, "/home/joshua/projects/slms")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import (
    Organization,
    Lead,
    User,
    LeadActivity,
    LEAD_STATUSES,
    LEAD_STATUS_NEW,
    LEAD_STATUS_WON,
    LEAD_STATUS_LOST,
    ACTIVITY_TYPES,
)

# Demo data pools
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
    "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts", "Chen", "Kim", "Patel", "Kumar", "Singh", "Park", "Wang",
]

COMPANIES = [
    "Acme Corp", "TechStart Inc", "Global Solutions", "Prime Industries", "NextGen Systems",
    "Innovate Labs", "Summit Partners", "Velocity Group", "Apex Technologies", "Horizon Digital",
    "Atlas Consulting", "Pinnacle Software", "Bridge Ventures", "Core Dynamics", "Fusion Media",
    "Quantum Analytics", "Stellar Networks", "Vanguard Tech", "Zenith Solutions", "Alpha Industries",
    "Beta Systems", "Gamma Technologies", "Delta Enterprises", "Omega Corp", "Sigma Partners",
    "Phoenix Digital", "Titan Software", "Neptune Analytics", "Jupiter Systems", "Mercury Labs",
    "Solar Innovations", "Lunar Tech", "Comet Data", "Nova Solutions", "Orbit Media",
    "Rocket Startups", "Galaxy Group", "Cosmos Inc", "Nebula Networks", "Pulsar Technologies",
]

SOURCES = [
    "Website Form", "Google Ads", "LinkedIn", "Facebook Ads", "Referral", "Cold Call",
    "Trade Show", "Webinar", "Email Campaign", "Partner", "Organic Search", "Direct",
]

UTM_SOURCES = ["google", "facebook", "linkedin", "twitter", "email", "referral", None]
UTM_MEDIUMS = ["cpc", "social", "email", "organic", "referral", None]
UTM_CAMPAIGNS = ["spring_sale", "product_launch", "brand_awareness", "retargeting", None]


def generate_email(first_name: str, last_name: str, company: str) -> str:
    """Generate a realistic email."""
    domain = company.lower().replace(" ", "").replace(".", "")[:12] + ".com"
    formats = [
        f"{first_name.lower()}.{last_name.lower()}@{domain}",
        f"{first_name[0].lower()}{last_name.lower()}@{domain}",
        f"{first_name.lower()}@{domain}",
    ]
    return random.choice(formats)


def generate_phone() -> str:
    """Generate a realistic US phone number."""
    area = random.randint(200, 999)
    prefix = random.randint(200, 999)
    line = random.randint(1000, 9999)
    return f"({area}) {prefix}-{line}"


def random_date_in_range(start_days_ago: int, end_days_ago: int) -> datetime:
    """Generate random datetime within range."""
    days_ago = random.randint(end_days_ago, start_days_ago)
    hours_ago = random.randint(0, 23)
    minutes_ago = random.randint(0, 59)
    return datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)


def seed_leads(session, org_id: int, user_id: int, count: int = 150):
    """Seed demo leads."""
    leads = []

    # Status distribution (realistic funnel)
    status_weights = {
        "new": 35,
        "contacted": 25,
        "qualified": 15,
        "proposal": 10,
        "negotiation": 8,
        "won": 5,
        "lost": 2,
    }

    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        company = random.choice(COMPANIES)

        # Weighted random status
        status = random.choices(
            list(status_weights.keys()),
            weights=list(status_weights.values())
        )[0]

        # Generate realistic scores
        base_score = random.randint(20, 95)
        score_engagement = random.randint(10, 100)
        score_source = random.randint(10, 100)
        score_value = random.randint(10, 100)
        score_velocity = random.randint(10, 100)
        score_fit = random.randint(10, 100)

        # Higher scores for further pipeline stages
        if status in ["qualified", "proposal", "negotiation", "won"]:
            base_score = random.randint(60, 98)

        # Deal value based on status
        deal_value = None
        if status in ["qualified", "proposal", "negotiation", "won", "lost"]:
            deal_value = Decimal(random.choice([
                1500, 2500, 5000, 7500, 10000, 15000, 25000, 50000, 75000, 100000
            ]))

        # Created date - spread over last 90 days
        created_at = random_date_in_range(90, 0)

        # Closed date for won/lost
        closed_at = None
        if status in ["won", "lost"]:
            closed_at = created_at + timedelta(days=random.randint(5, 30))

        lead = Lead(
            organization_id=org_id,
            name=f"{first_name} {last_name}",
            first_name=first_name,
            last_name=last_name,
            email=generate_email(first_name, last_name, company),
            phone=generate_phone(),
            company=company,
            source=random.choice(SOURCES),
            status=status,
            score=base_score,
            score_engagement=score_engagement,
            score_source=score_source,
            score_value=score_value,
            score_velocity=score_velocity,
            score_fit=score_fit,
            win_probability=random.randint(10, 90) if status not in ["won", "lost"] else (100 if status == "won" else 0),
            deal_value=deal_value,
            closed_at=closed_at,
            assigned_user_id=user_id if random.random() > 0.3 else None,
            utm_source=random.choice(UTM_SOURCES),
            utm_medium=random.choice(UTM_MEDIUMS),
            utm_campaign=random.choice(UTM_CAMPAIGNS),
            created_at=created_at,
            updated_at=created_at + timedelta(hours=random.randint(0, 48)),
            score_updated_at=datetime.utcnow() - timedelta(hours=random.randint(0, 72)),
        )
        leads.append(lead)

    session.add_all(leads)
    session.commit()
    print(f"Created {len(leads)} leads")
    return leads


def seed_activities(session, org_id: int, user_id: int, leads: list):
    """Seed demo activities for leads."""
    activities = []

    activity_subjects = {
        "call": ["Discovery call", "Follow-up call", "Demo scheduled", "Pricing discussion", "Contract review"],
        "email": ["Introduction email", "Proposal sent", "Follow-up", "Thank you note", "Contract attached"],
        "meeting": ["Initial meeting", "Product demo", "Technical review", "Executive meeting", "Contract signing"],
        "note": ["Interested in enterprise", "Budget approved", "Decision maker identified", "Competitor mentioned", "Timeline confirmed"],
    }

    outcomes = ["completed", "no_answer", "scheduled", "voicemail", "follow_up_needed"]

    for lead in leads:
        # More activities for leads further in pipeline
        activity_count = {
            "new": random.randint(0, 2),
            "contacted": random.randint(1, 3),
            "qualified": random.randint(2, 5),
            "proposal": random.randint(3, 6),
            "negotiation": random.randint(4, 8),
            "won": random.randint(5, 10),
            "lost": random.randint(2, 5),
        }.get(lead.status, 1)

        for _ in range(activity_count):
            activity_type = random.choice(ACTIVITY_TYPES)

            activity = LeadActivity(
                lead_id=lead.id,
                user_id=user_id,
                organization_id=org_id,
                activity_type=activity_type,
                subject=random.choice(activity_subjects[activity_type]),
                description=f"Activity logged for {lead.name}",
                duration_minutes=random.randint(5, 60) if activity_type in ["call", "meeting"] else None,
                outcome=random.choice(outcomes) if activity_type in ["call", "meeting"] else None,
                activity_at=lead.created_at + timedelta(days=random.randint(0, 14), hours=random.randint(0, 8)),
                created_at=lead.created_at + timedelta(days=random.randint(0, 14)),
            )
            activities.append(activity)

    session.add_all(activities)
    session.commit()
    print(f"Created {len(activities)} activities")


def main():
    import os

    # Check for production database URL
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Try to load from .env file (production or local)
        env_files = [
            "/opt/site2crm/.env",
            "/home/ubuntu/site2crm/.env",
            "/home/joshua/projects/slms/.env",
        ]
        for env_file in env_files:
            if os.path.exists(env_file):
                with open(env_file) as f:
                    for line in f:
                        if line.startswith("DATABASE_URL="):
                            db_url = line.strip().split("=", 1)[1].strip('"').strip("'")
                            break
                if db_url:
                    break

    if not db_url:
        print("No DATABASE_URL found. Set it in .env or environment.")
        print("For production: DATABASE_URL=postgresql://user:pass@host/db")
        return

    print(f"Connecting to: {db_url.split('@')[1] if '@' in db_url else 'database'}...")
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Find the admin org (site2crm.io domain or first org)
    org = session.query(Organization).filter(Organization.domain == "site2crm.io").first()
    if not org:
        org = session.query(Organization).first()

    if not org:
        print("No organization found. Please sign up first.")
        return

    print(f"Seeding data for org: {org.name or org.domain} (ID: {org.id})")

    # Find a user in this org
    user = session.query(User).filter(User.organization_id == org.id).first()
    if not user:
        print("No user found in organization.")
        return

    print(f"Using user: {user.email} (ID: {user.id})")

    # Clear existing leads first (optional)
    existing_count = session.query(Lead).filter(Lead.organization_id == org.id).count()
    if existing_count > 0:
        confirm = input(f"Found {existing_count} existing leads. Delete them first? (y/n): ")
        if confirm.lower() == 'y':
            session.query(LeadActivity).filter(LeadActivity.organization_id == org.id).delete()
            session.query(Lead).filter(Lead.organization_id == org.id).delete()
            session.commit()
            print("Deleted existing leads and activities")

    # Seed new data
    leads = seed_leads(session, org.id, user.id, count=150)
    seed_activities(session, org.id, user.id, leads)

    # Update org lead count
    org.leads_this_month = session.query(Lead).filter(
        Lead.organization_id == org.id,
        Lead.created_at >= datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    ).count()
    session.commit()

    print(f"\nDone! Seeded {len(leads)} leads with activities.")
    print(f"Org leads this month: {org.leads_this_month}")


if __name__ == "__main__":
    main()
