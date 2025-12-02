#!/usr/bin/env python3
"""
Seed script for Site2CRM demo data.

Generates realistic sales data including:
- 1200+ leads across multiple industries
- 9 lead sources with realistic distribution
- Configurable number of salespeople (default 6)
- Lead activities (calls, emails, meetings)
- Realistic performance patterns per salesperson
- Time range configurable (default 18 months)

Usage:
    python scripts/seed_demo_data.py [--leads 1200] [--salespeople 6] [--months 18] [--org-id 1]
"""

import argparse
import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.db.models import (
    Organization,
    User,
    Lead,
    LeadActivity,
    Salesperson,
    LEAD_STATUS_NEW,
    LEAD_STATUS_CONTACTED,
    LEAD_STATUS_QUALIFIED,
    LEAD_STATUS_PROPOSAL,
    LEAD_STATUS_NEGOTIATION,
    LEAD_STATUS_WON,
    LEAD_STATUS_LOST,
    ACTIVITY_CALL,
    ACTIVITY_EMAIL,
    ACTIVITY_MEETING,
    ACTIVITY_NOTE,
)
from app.core.security import get_password_hash

# ============================================================================
# REALISTIC DATA POOLS
# ============================================================================

FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
    "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
    "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
    "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
    "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
    "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz",
    "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales",
    "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson",
]

# Multi-industry company names (Site2CRM target market)
COMPANY_PREFIXES = [
    "Acme", "Atlas", "Beacon", "Blue", "Bright", "Capital", "Cascade", "Cloud",
    "Coastal", "Core", "Digital", "Dynamic", "Eagle", "Edge", "Elite", "Ember",
    "Empire", "Fusion", "Global", "Golden", "Green", "Harbor", "Horizon", "Impact",
    "Insight", "Iron", "Keystone", "Legacy", "Liberty", "Lunar", "Metro", "Modern",
    "Nexus", "Noble", "North", "Nova", "Oak", "Omega", "Onyx", "Pacific",
    "Peak", "Phoenix", "Pine", "Pioneer", "Platinum", "Prime", "Pulse", "Quest",
    "Rapid", "Red", "Sage", "Silver", "Sky", "Solar", "Spark", "Spectrum",
    "Spring", "Star", "Sterling", "Stone", "Storm", "Summit", "Swift", "Titan",
    "True", "United", "Urban", "Valley", "Vector", "Venture", "Vista", "Wave",
]

COMPANY_SUFFIXES = [
    "Solutions", "Technologies", "Systems", "Group", "Partners", "Consulting",
    "Services", "Industries", "Labs", "Digital", "Media", "Studios", "Agency",
    "Corp", "Co", "Inc", "LLC", "Enterprises", "Holdings", "Ventures",
    "Capital", "Dynamics", "Innovations", "Networks", "Software", "Tech",
]

INDUSTRIES = [
    "Software", "Marketing", "Healthcare", "Finance", "Real Estate", "Manufacturing",
    "Retail", "Professional Services", "Construction", "Education", "Hospitality",
]

# 9 Lead sources with realistic distribution weights
LEAD_SOURCES = {
    "Website Form": 0.25,       # 25% - Primary source
    "Google Ads": 0.18,         # 18%
    "LinkedIn": 0.12,           # 12%
    "Referral": 0.12,           # 12%
    "Facebook Ads": 0.10,       # 10%
    "Organic Search": 0.08,     # 8%
    "Trade Show": 0.06,         # 6%
    "Cold Outreach": 0.05,      # 5%
    "Partner": 0.04,            # 4%
}

# Salesperson archetypes with performance multipliers
SALESPERSON_ARCHETYPES = [
    {"name": "Top Performer", "close_rate": 0.35, "activity_mult": 1.3, "avg_deal_mult": 1.2},
    {"name": "Solid Performer", "close_rate": 0.28, "activity_mult": 1.1, "avg_deal_mult": 1.0},
    {"name": "Consistent", "close_rate": 0.24, "activity_mult": 1.0, "avg_deal_mult": 0.95},
    {"name": "Developing", "close_rate": 0.20, "activity_mult": 0.9, "avg_deal_mult": 0.85},
    {"name": "New Hire", "close_rate": 0.15, "activity_mult": 0.7, "avg_deal_mult": 0.75},
    {"name": "Veteran", "close_rate": 0.30, "activity_mult": 0.85, "avg_deal_mult": 1.15},
]

SALESPERSON_NAMES = [
    "Alex Chen", "Jordan Rivera", "Taylor Morgan", "Casey Williams", "Morgan Davis",
    "Riley Thompson", "Avery Martinez", "Quinn Johnson", "Jamie Anderson", "Drew Wilson",
    "Sam Parker", "Cameron Lee", "Blake Roberts", "Reese Garcia", "Skyler Brown",
]

# Activity outcomes
CALL_OUTCOMES = ["completed", "no_answer", "voicemail", "callback_scheduled", "not_interested"]
EMAIL_OUTCOMES = ["sent", "opened", "replied", "bounced"]
MEETING_OUTCOMES = ["completed", "cancelled", "rescheduled", "no_show"]

# Deal value ranges by industry (min, max in dollars)
DEAL_VALUE_RANGES = {
    "Software": (5000, 150000),
    "Marketing": (2000, 50000),
    "Healthcare": (10000, 200000),
    "Finance": (15000, 300000),
    "Real Estate": (5000, 100000),
    "Manufacturing": (20000, 500000),
    "Retail": (1000, 30000),
    "Professional Services": (3000, 75000),
    "Construction": (25000, 400000),
    "Education": (2000, 40000),
    "Hospitality": (1500, 25000),
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def random_date(start: datetime, end: datetime) -> datetime:
    """Generate random datetime between start and end."""
    delta = end - start
    random_days = random.random() * delta.days
    return start + timedelta(days=random_days)


def weighted_choice(choices: dict) -> str:
    """Select from dict with weighted probabilities."""
    items = list(choices.keys())
    weights = list(choices.values())
    return random.choices(items, weights=weights, k=1)[0]


def generate_email(first_name: str, last_name: str, company: str) -> str:
    """Generate realistic business email."""
    domain = company.lower().replace(" ", "").replace(",", "")[:20]
    formats = [
        f"{first_name.lower()}.{last_name.lower()}@{domain}.com",
        f"{first_name.lower()[0]}{last_name.lower()}@{domain}.com",
        f"{first_name.lower()}@{domain}.com",
        f"{last_name.lower()}.{first_name.lower()[0]}@{domain}.com",
    ]
    return random.choice(formats)


def generate_phone() -> str:
    """Generate US phone number."""
    area = random.randint(200, 999)
    prefix = random.randint(200, 999)
    line = random.randint(1000, 9999)
    return f"({area}) {prefix}-{line}"


def generate_company() -> str:
    """Generate company name."""
    prefix = random.choice(COMPANY_PREFIXES)
    suffix = random.choice(COMPANY_SUFFIXES)
    return f"{prefix} {suffix}"


# ============================================================================
# SEED FUNCTIONS
# ============================================================================

def create_or_get_demo_org(db: Session, org_id: int = None) -> Organization:
    """Create or get demo organization."""
    if org_id:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org:
            return org

    # Check for existing demo org
    org = db.query(Organization).filter(Organization.domain == "demo.site2crm.com").first()
    if org:
        return org

    # Create new demo org
    org = Organization(
        name="Site2CRM Demo",
        domain="demo.site2crm.com",
        api_key="demo_api_key_" + "".join(random.choices("abcdef0123456789", k=32)),
        plan="enterprise",
        subscription_status="active",
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    print(f"Created demo organization: {org.name} (ID: {org.id})")
    return org


def create_salespeople(db: Session, org: Organization, count: int) -> list[tuple[User, Salesperson]]:
    """Create salesperson users and profiles."""
    salespeople = []

    for i in range(count):
        name = SALESPERSON_NAMES[i % len(SALESPERSON_NAMES)]
        archetype = SALESPERSON_ARCHETYPES[i % len(SALESPERSON_ARCHETYPES)]

        first, last = name.split(" ", 1)
        email = f"{first.lower()}.{last.lower()}@demo.site2crm.com"

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password=get_password_hash("demo123!"),
                role="USER",
                organization_id=org.id,
                email_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Check if salesperson profile exists
        sp = db.query(Salesperson).filter(Salesperson.user_id == user.id).first()
        if not sp:
            # Monthly quota based on archetype
            base_quota = Decimal("50000")
            quota = base_quota * Decimal(str(archetype["avg_deal_mult"]))

            sp = Salesperson(
                user_id=user.id,
                organization_id=org.id,
                display_name=name,
                monthly_quota=quota,
                monthly_lead_target=random.randint(15, 30),
                hire_date=datetime.now().date() - timedelta(days=random.randint(90, 730)),
                is_active=True,
            )
            db.add(sp)
            db.commit()
            db.refresh(sp)

        salespeople.append((user, sp, archetype))
        print(f"  Created salesperson: {name} ({archetype['name']})")

    return salespeople


def create_leads(
    db: Session,
    org: Organization,
    salespeople: list,
    lead_count: int,
    months: int,
) -> list[Lead]:
    """Create leads with realistic distribution."""
    leads = []
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=months * 30)

    # Pre-generate industry for each company to keep consistent deal values
    company_industries = {}

    for i in range(lead_count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        company = generate_company()

        # Assign industry to company
        if company not in company_industries:
            company_industries[company] = random.choice(INDUSTRIES)
        industry = company_industries[company]

        # Lead source
        source = weighted_choice(LEAD_SOURCES)

        # Create date with slight seasonal pattern (more leads in Q1/Q4)
        created_at = random_date(start_date, end_date)
        month = created_at.month
        if month in [1, 2, 3, 10, 11, 12]:  # Q1 and Q4
            if random.random() < 0.3:  # 30% chance to shift to busier period
                created_at = random_date(start_date, end_date)

        # Assign salesperson (weighted by activity multiplier)
        user, sp, archetype = random.choices(
            salespeople,
            weights=[a["activity_mult"] for _, _, a in salespeople],
            k=1
        )[0]

        # Determine lead status based on archetype close rate and time
        days_old = (end_date - created_at).days

        # Leads progress through pipeline over time
        if days_old < 7:
            status = random.choice([LEAD_STATUS_NEW, LEAD_STATUS_CONTACTED])
        elif days_old < 21:
            status = random.choice([LEAD_STATUS_CONTACTED, LEAD_STATUS_QUALIFIED, LEAD_STATUS_NEW])
        elif days_old < 45:
            status = random.choice([
                LEAD_STATUS_QUALIFIED, LEAD_STATUS_PROPOSAL,
                LEAD_STATUS_CONTACTED, LEAD_STATUS_WON, LEAD_STATUS_LOST
            ])
        else:
            # Older leads should be mostly closed
            if random.random() < archetype["close_rate"]:
                status = LEAD_STATUS_WON
            elif random.random() < 0.5:
                status = LEAD_STATUS_LOST
            else:
                status = random.choice([
                    LEAD_STATUS_PROPOSAL, LEAD_STATUS_NEGOTIATION,
                    LEAD_STATUS_QUALIFIED
                ])

        # Deal value based on industry
        min_val, max_val = DEAL_VALUE_RANGES.get(industry, (5000, 50000))
        base_value = random.uniform(min_val, max_val)
        deal_value = Decimal(str(round(base_value * archetype["avg_deal_mult"], 2)))

        # Closed date if won/lost
        closed_at = None
        if status in [LEAD_STATUS_WON, LEAD_STATUS_LOST]:
            # Close 14-60 days after creation
            days_to_close = random.randint(14, min(60, days_old))
            closed_at = created_at + timedelta(days=days_to_close)

        # Notes
        notes_options = [
            None,
            f"Interested in {industry.lower()} solutions.",
            f"Met at {source} - follow up scheduled.",
            f"Decision maker, {random.randint(10, 500)} employees.",
            f"Budget approved for Q{random.randint(1, 4)}.",
            f"Comparing with 2-3 competitors.",
            f"Current solution: {random.choice(['HubSpot', 'Salesforce', 'Pipedrive', 'Excel', 'None'])}",
        ]

        lead = Lead(
            name=f"{first_name} {last_name}",
            first_name=first_name,
            last_name=last_name,
            email=generate_email(first_name, last_name, company),
            phone=generate_phone() if random.random() > 0.2 else None,
            company=company,
            source=source,
            notes=random.choice(notes_options),
            status=status,
            deal_value=deal_value if status != LEAD_STATUS_NEW else None,
            closed_at=closed_at,
            assigned_user_id=user.id,
            organization_id=org.id,
            created_at=created_at,
            updated_at=created_at + timedelta(days=random.randint(0, days_old)),
        )
        db.add(lead)
        leads.append(lead)

        if (i + 1) % 200 == 0:
            db.commit()
            print(f"  Created {i + 1}/{lead_count} leads...")

    db.commit()
    print(f"  Created {len(leads)} leads total")
    return leads


def create_activities(
    db: Session,
    org: Organization,
    leads: list[Lead],
    salespeople: list,
) -> int:
    """Create activities for leads."""
    activity_count = 0
    sp_lookup = {user.id: archetype for user, sp, archetype in salespeople}

    for lead in leads:
        if not lead.assigned_user_id:
            continue

        archetype = sp_lookup.get(lead.assigned_user_id, {"activity_mult": 1.0})

        # Number of activities based on lead status and salesperson activity level
        status_activity_base = {
            LEAD_STATUS_NEW: (0, 2),
            LEAD_STATUS_CONTACTED: (1, 4),
            LEAD_STATUS_QUALIFIED: (3, 8),
            LEAD_STATUS_PROPOSAL: (5, 12),
            LEAD_STATUS_NEGOTIATION: (7, 15),
            LEAD_STATUS_WON: (8, 20),
            LEAD_STATUS_LOST: (3, 10),
        }

        min_acts, max_acts = status_activity_base.get(lead.status, (1, 5))
        num_activities = int(random.randint(min_acts, max_acts) * archetype["activity_mult"])

        lead_created = lead.created_at
        now = datetime.utcnow()

        for _ in range(num_activities):
            # Activity type distribution
            activity_type = random.choices(
                [ACTIVITY_EMAIL, ACTIVITY_CALL, ACTIVITY_MEETING, ACTIVITY_NOTE],
                weights=[0.45, 0.30, 0.15, 0.10],
                k=1
            )[0]

            # Activity date between lead creation and now
            activity_date = random_date(lead_created, now)

            # Subject and outcome based on type
            if activity_type == ACTIVITY_EMAIL:
                subjects = [
                    "Introduction and value proposition",
                    "Follow-up on our conversation",
                    "Proposal attached",
                    "Quick question about your needs",
                    "Case study you might find interesting",
                    "Checking in",
                    "Meeting recap and next steps",
                ]
                outcome = random.choice(EMAIL_OUTCOMES)
                duration = None
            elif activity_type == ACTIVITY_CALL:
                subjects = [
                    "Discovery call",
                    "Product demo",
                    "Pricing discussion",
                    "Follow-up call",
                    "Check-in call",
                    "Technical questions",
                    "Contract review",
                ]
                outcome = random.choice(CALL_OUTCOMES)
                duration = random.randint(5, 45)
            elif activity_type == ACTIVITY_MEETING:
                subjects = [
                    "Initial consultation",
                    "Product demo meeting",
                    "Proposal presentation",
                    "Stakeholder meeting",
                    "Contract negotiation",
                    "Implementation planning",
                    "Quarterly review",
                ]
                outcome = random.choice(MEETING_OUTCOMES)
                duration = random.randint(30, 90)
            else:  # NOTE
                subjects = [
                    "Left voicemail",
                    "Competitor mentioned",
                    "Budget concerns noted",
                    "Timeline updated",
                    "New stakeholder identified",
                    "Objection handled",
                ]
                outcome = None
                duration = None

            activity = LeadActivity(
                lead_id=lead.id,
                user_id=lead.assigned_user_id,
                organization_id=org.id,
                activity_type=activity_type,
                subject=random.choice(subjects),
                duration_minutes=duration,
                outcome=outcome,
                activity_at=activity_date,
                created_at=activity_date,
            )
            db.add(activity)
            activity_count += 1

        if activity_count % 1000 == 0:
            db.commit()

    db.commit()
    return activity_count


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Seed Site2CRM demo data")
    parser.add_argument("--leads", type=int, default=1200, help="Number of leads to create")
    parser.add_argument("--salespeople", type=int, default=6, help="Number of salespeople")
    parser.add_argument("--months", type=int, default=18, help="Months of historical data")
    parser.add_argument("--org-id", type=int, default=None, help="Existing org ID to use")
    parser.add_argument("--clear", action="store_true", help="Clear existing demo data first")
    args = parser.parse_args()

    print("=" * 60)
    print("Site2CRM Demo Data Seeder")
    print("=" * 60)
    print(f"Leads: {args.leads}")
    print(f"Salespeople: {args.salespeople}")
    print(f"Time range: {args.months} months")
    print()

    # Create tables if needed
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Get or create org
        print("Setting up organization...")
        org = create_or_get_demo_org(db, args.org_id)

        if args.clear:
            print("Clearing existing demo data...")
            db.query(LeadActivity).filter(LeadActivity.organization_id == org.id).delete()
            db.query(Lead).filter(Lead.organization_id == org.id).delete()
            db.commit()
            print("  Cleared existing leads and activities")

        # Create salespeople
        print(f"\nCreating {args.salespeople} salespeople...")
        salespeople = create_salespeople(db, org, args.salespeople)

        # Create leads
        print(f"\nCreating {args.leads} leads...")
        leads = create_leads(db, org, salespeople, args.leads, args.months)

        # Create activities
        print("\nCreating lead activities...")
        activity_count = create_activities(db, org, leads, salespeople)
        print(f"  Created {activity_count} activities")

        # Summary stats
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)

        won = sum(1 for l in leads if l.status == LEAD_STATUS_WON)
        lost = sum(1 for l in leads if l.status == LEAD_STATUS_LOST)
        total_revenue = sum(float(l.deal_value or 0) for l in leads if l.status == LEAD_STATUS_WON)

        print(f"Organization: {org.name} (ID: {org.id})")
        print(f"Total leads: {len(leads)}")
        print(f"  - Won: {won} ({won/len(leads)*100:.1f}%)")
        print(f"  - Lost: {lost} ({lost/len(leads)*100:.1f}%)")
        print(f"  - In pipeline: {len(leads) - won - lost}")
        print(f"Total revenue (won): ${total_revenue:,.2f}")
        print(f"Avg deal size: ${total_revenue/max(won,1):,.2f}")
        print(f"Activities: {activity_count}")
        print(f"\nLead sources:")
        source_counts = {}
        for l in leads:
            source_counts[l.source] = source_counts.get(l.source, 0) + 1
        for source, count in sorted(source_counts.items(), key=lambda x: -x[1]):
            print(f"  - {source}: {count} ({count/len(leads)*100:.1f}%)")

        print("\nSeed complete!")

    finally:
        db.close()


if __name__ == "__main__":
    main()
