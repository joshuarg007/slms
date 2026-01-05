#!/usr/bin/env python3
"""
Quick Test Data Seeder for Site2CRM

This script creates realistic test data for an existing organization.
No CRM connections needed - just generates fake but realistic-looking data.

Usage:
    # Seed data for organization ID 1 (default)
    python scripts/seed_test_user.py

    # Seed data for a specific organization
    python scripts/seed_test_user.py --org-id 2

    # Customize amount of data
    python scripts/seed_test_user.py --leads 500 --months 12

    # Clear existing and reseed
    python scripts/seed_test_user.py --clear --leads 1500
"""

import argparse
import random
import sys
from datetime import datetime, timedelta, date
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
# REALISTIC DATA - Scientifically distributed
# ============================================================================

# Real US first names (top 100 by popularity)
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
    "Benjamin", "Samantha", "Samuel", "Katherine", "Raymond", "Christine", "Gregory", "Debra",
    "Frank", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet", "Jack", "Catherine",
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
    "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward",
    "Richardson", "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray",
    "Mendoza", "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel",
]

# Company name parts - creates ~10,000 unique combinations
COMPANY_PREFIX = [
    "Acme", "Atlas", "Apex", "Aurora", "Beacon", "Blue", "Bold", "Bridge",
    "Bright", "Capital", "Cascade", "Century", "Citadel", "Civic", "Clear", "Cloud",
    "Coastal", "Compass", "Core", "Crown", "Crystal", "Delta", "Digital", "Dynamic",
    "Eagle", "Echo", "Edge", "Elevate", "Elite", "Ember", "Empire", "Endeavor",
    "Envision", "Epic", "Evolve", "Excel", "First", "Focal", "Forge", "Forward",
    "Foundation", "Frontier", "Fusion", "Future", "Gateway", "Genesis", "Global", "Golden",
    "Granite", "Green", "Growth", "Harbor", "Haven", "Heritage", "Highland", "Horizon",
    "Hub", "Impact", "Infinity", "Insight", "Integral", "Iron", "Ivy", "Jade",
    "Key", "Keystone", "Knight", "Lake", "Landmark", "Legacy", "Liberty", "Light",
    "Lumen", "Lunar", "Magnolia", "Matrix", "Maven", "Meridian", "Metro", "Milestone",
    "Modern", "Momentum", "Mountain", "Nexus", "Noble", "North", "Nova", "Oak",
    "Omega", "Onyx", "Orbit", "Origin", "Pacific", "Paramount", "Path", "Peak",
    "Phoenix", "Pine", "Pioneer", "Pixel", "Platinum", "Point", "Polaris", "Prairie",
    "Premier", "Prime", "Prism", "Prospect", "Pulse", "Pure", "Quest", "Radiant",
    "Rapid", "Reach", "Red", "Ridge", "Rise", "River", "Rock", "Sage",
    "Sapphire", "Scale", "Scope", "Sentinel", "Sequoia", "Sierra", "Signal", "Silver",
    "Sky", "Smart", "Solar", "Solid", "Solution", "Southern", "Spark", "Spectrum",
    "Spring", "Square", "Star", "Steel", "Sterling", "Stone", "Storm", "Strategic",
    "Summit", "Sun", "Superior", "Swift", "Synergy", "Tactic", "Terra", "Thrive",
    "Titan", "Tower", "Trail", "Transform", "Trend", "Triangle", "True", "Trust",
    "Ultra", "Union", "United", "Unity", "Universal", "Upward", "Urban", "Valley",
    "Vanguard", "Vector", "Velocity", "Venture", "Vertex", "Victory", "Vision", "Vista",
    "Vital", "Wave", "Western", "Willow", "Wind", "Wing", "Zenith", "Zone",
]

COMPANY_SUFFIX = [
    "Solutions", "Technologies", "Tech", "Systems", "Group", "Partners", "Consulting",
    "Services", "Industries", "Labs", "Digital", "Media", "Studios", "Agency",
    "Corp", "Co", "Inc", "LLC", "Enterprises", "Holdings", "Ventures", "Global",
    "Capital", "Dynamics", "Innovations", "Networks", "Software", "Analytics",
    "Advisors", "Associates", "Brands", "Creative", "Design", "Development",
    "Engineering", "Financial", "Health", "Intelligence", "International", "Logistics",
    "Management", "Marketing", "Medical", "Professional", "Properties", "Resources",
    "Strategies", "Supply", "Trading", "Wealth",
]

# Industries with realistic deal value ranges
INDUSTRIES = {
    "SaaS / Software": {"min": 5000, "max": 250000, "weight": 0.22},
    "Marketing Agency": {"min": 2000, "max": 75000, "weight": 0.15},
    "Healthcare": {"min": 10000, "max": 300000, "weight": 0.10},
    "Financial Services": {"min": 15000, "max": 500000, "weight": 0.12},
    "Real Estate": {"min": 5000, "max": 150000, "weight": 0.08},
    "Manufacturing": {"min": 20000, "max": 750000, "weight": 0.08},
    "E-commerce": {"min": 3000, "max": 100000, "weight": 0.10},
    "Professional Services": {"min": 3000, "max": 100000, "weight": 0.07},
    "Construction": {"min": 25000, "max": 600000, "weight": 0.05},
    "Education": {"min": 2000, "max": 50000, "weight": 0.03},
}

# Lead sources with conversion-optimized weights
LEAD_SOURCES = {
    "Website Form": 0.28,       # Highest intent
    "Google Ads": 0.18,         # Paid search
    "LinkedIn": 0.14,           # B2B focused
    "Referral": 0.12,           # High quality
    "Facebook Ads": 0.08,       # Social
    "Organic Search": 0.08,     # SEO
    "Trade Show": 0.05,         # Events
    "Cold Outreach": 0.04,      # Outbound
    "Partner": 0.03,            # Channel
}

# Salesperson archetypes with performance characteristics
SALESPERSON_ARCHETYPES = [
    {"name": "Elite Closer", "close_rate": 0.38, "activity_mult": 1.4, "deal_mult": 1.25, "tenure_months": 36},
    {"name": "Top Performer", "close_rate": 0.32, "activity_mult": 1.25, "deal_mult": 1.15, "tenure_months": 24},
    {"name": "Solid Producer", "close_rate": 0.26, "activity_mult": 1.1, "deal_mult": 1.0, "tenure_months": 18},
    {"name": "Consistent Rep", "close_rate": 0.22, "activity_mult": 1.0, "deal_mult": 0.95, "tenure_months": 12},
    {"name": "Growing Rep", "close_rate": 0.18, "activity_mult": 0.9, "deal_mult": 0.85, "tenure_months": 6},
    {"name": "New Hire", "close_rate": 0.12, "activity_mult": 0.7, "deal_mult": 0.75, "tenure_months": 3},
]

SALESPERSON_NAMES = [
    "Alex Chen", "Jordan Rivera", "Taylor Morgan", "Casey Williams",
    "Morgan Davis", "Riley Thompson", "Avery Martinez", "Quinn Johnson",
    "Jamie Anderson", "Drew Wilson", "Sam Parker", "Cameron Lee",
]

# Activity types and their outcomes
ACTIVITY_CONFIG = {
    ACTIVITY_EMAIL: {
        "weight": 0.45,
        "outcomes": ["sent", "opened", "clicked", "replied", "bounced"],
        "subjects": [
            "Introduction - How we help companies like {company}",
            "Following up on our conversation",
            "Quick question about your {industry} needs",
            "Proposal for {company}",
            "Case study: How {similar_company} increased efficiency by 40%",
            "Checking in - any questions?",
            "Next steps for {company}",
            "Resource: {industry} best practices guide",
        ],
    },
    ACTIVITY_CALL: {
        "weight": 0.30,
        "outcomes": ["completed", "no_answer", "voicemail", "callback_scheduled", "not_interested"],
        "subjects": [
            "Discovery call - understand requirements",
            "Product demo call",
            "Pricing discussion",
            "Follow-up call",
            "Technical deep dive",
            "Executive introduction",
            "Contract review call",
            "Objection handling",
        ],
        "duration_range": (5, 45),
    },
    ACTIVITY_MEETING: {
        "weight": 0.15,
        "outcomes": ["completed", "rescheduled", "cancelled", "no_show"],
        "subjects": [
            "Initial discovery meeting",
            "Product demonstration",
            "Proposal presentation",
            "Stakeholder alignment meeting",
            "Contract negotiation",
            "Implementation planning",
            "Quarterly business review",
            "Executive sponsor meeting",
        ],
        "duration_range": (30, 90),
    },
    ACTIVITY_NOTE: {
        "weight": 0.10,
        "outcomes": [],
        "subjects": [
            "Competitor mentioned: {competitor}",
            "Budget confirmed for Q{quarter}",
            "Decision timeline: {timeline}",
            "Key stakeholder identified: {stakeholder}",
            "Pain point: {pain_point}",
            "Current solution: {current_solution}",
            "Objection: {objection}",
            "Next step: {next_step}",
        ],
    },
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def weighted_choice(choices: dict) -> str:
    """Select from dict with weighted probabilities."""
    items = list(choices.keys())
    weights = list(choices.values())
    return random.choices(items, weights=weights, k=1)[0]


def random_date(start: datetime, end: datetime) -> datetime:
    """Generate random datetime with realistic business hour distribution."""
    delta = end - start
    random_seconds = random.random() * delta.total_seconds()
    base_date = start + timedelta(seconds=random_seconds)

    # Bias toward business hours (9-6) and weekdays
    if base_date.weekday() >= 5:  # Weekend
        base_date += timedelta(days=7 - base_date.weekday())
    if base_date.hour < 9:
        base_date = base_date.replace(hour=9 + random.randint(0, 3))
    elif base_date.hour > 18:
        base_date = base_date.replace(hour=14 + random.randint(0, 4))

    return base_date


def generate_email(first: str, last: str, company: str) -> str:
    """Generate realistic business email."""
    domain = company.lower().replace(" ", "").replace(",", "")[:15]
    domain = "".join(c for c in domain if c.isalnum())
    formats = [
        f"{first.lower()}.{last.lower()}@{domain}.com",
        f"{first.lower()[0]}{last.lower()}@{domain}.com",
        f"{first.lower()}@{domain}.com",
        f"{last.lower()}.{first.lower()[0]}@{domain}.com",
    ]
    return random.choice(formats)


def generate_phone() -> str:
    """Generate US phone number with realistic area codes."""
    # Common US area codes
    area_codes = [212, 310, 415, 312, 404, 617, 305, 713, 214, 303, 206, 512, 602, 619, 702, 818]
    area = random.choice(area_codes)
    prefix = random.randint(200, 999)
    line = random.randint(1000, 9999)
    return f"({area}) {prefix}-{line}"


def generate_company() -> str:
    """Generate unique company name."""
    return f"{random.choice(COMPANY_PREFIX)} {random.choice(COMPANY_SUFFIX)}"


def get_industry() -> tuple:
    """Get random industry with weighted probability."""
    industries = list(INDUSTRIES.keys())
    weights = [INDUSTRIES[i]["weight"] for i in industries]
    industry = random.choices(industries, weights=weights, k=1)[0]
    return industry, INDUSTRIES[industry]


# ============================================================================
# SEED FUNCTIONS
# ============================================================================

def ensure_org_exists(db: Session, org_id: int) -> Organization:
    """Ensure organization exists."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        print(f"ERROR: Organization ID {org_id} not found!")
        print("Available organizations:")
        orgs = db.query(Organization).all()
        for o in orgs:
            print(f"  ID {o.id}: {o.name} ({o.domain})")
        sys.exit(1)
    return org


def create_salespeople(db: Session, org: Organization, count: int) -> list:
    """Create or get salespeople for the organization."""
    salespeople = []

    for i in range(min(count, len(SALESPERSON_NAMES))):
        name = SALESPERSON_NAMES[i]
        archetype = SALESPERSON_ARCHETYPES[i % len(SALESPERSON_ARCHETYPES)]

        first, last = name.split(" ", 1)
        email = f"{first.lower()}.{last.lower()}@{org.domain or 'demo.com'}"

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password=get_password_hash("TestPassword123!"),
                role="USER",
                organization_id=org.id,
                email_verified=True,
                is_approved=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Check if salesperson profile exists
        sp = db.query(Salesperson).filter(Salesperson.user_id == user.id).first()
        if not sp:
            base_quota = Decimal("75000")
            quota = base_quota * Decimal(str(archetype["deal_mult"]))

            sp = Salesperson(
                user_id=user.id,
                organization_id=org.id,
                display_name=name,
                monthly_quota=quota,
                monthly_lead_target=random.randint(20, 40),
                hire_date=date.today() - timedelta(days=archetype["tenure_months"] * 30),
                is_active=True,
            )
            db.add(sp)
            db.commit()
            db.refresh(sp)

        salespeople.append((user, sp, archetype))
        print(f"  + {name} ({archetype['name']}) - {archetype['close_rate']*100:.0f}% close rate")

    return salespeople


def create_leads(db: Session, org: Organization, salespeople: list, count: int, months: int) -> list:
    """Create leads with realistic distribution patterns."""
    leads = []
    now = datetime.utcnow()
    start_date = now - timedelta(days=months * 30)

    # Track company industries for consistency
    company_industries = {}

    print(f"\n  Generating {count} leads across {months} months...")

    for i in range(count):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        company = generate_company()

        # Assign industry to company
        if company not in company_industries:
            industry, industry_data = get_industry()
            company_industries[company] = (industry, industry_data)
        industry, industry_data = company_industries[company]

        # Lead source (weighted)
        source = weighted_choice(LEAD_SOURCES)

        # Creation date with seasonal pattern
        created_at = random_date(start_date, now)

        # Q1 and Q4 get 20% more leads (budget cycles)
        if created_at.month in [1, 2, 3, 10, 11, 12]:
            if random.random() < 0.2:
                created_at = random_date(start_date, now)

        # Assign salesperson (weighted by activity level)
        user, sp, archetype = random.choices(
            salespeople,
            weights=[a["activity_mult"] for _, _, a in salespeople],
            k=1
        )[0]

        # Determine status based on age and salesperson skill
        days_old = (now - created_at).days

        if days_old < 5:
            status = random.choice([LEAD_STATUS_NEW, LEAD_STATUS_NEW, LEAD_STATUS_CONTACTED])
        elif days_old < 14:
            status = random.choice([LEAD_STATUS_NEW, LEAD_STATUS_CONTACTED, LEAD_STATUS_CONTACTED, LEAD_STATUS_QUALIFIED])
        elif days_old < 30:
            status = random.choice([LEAD_STATUS_CONTACTED, LEAD_STATUS_QUALIFIED, LEAD_STATUS_PROPOSAL])
        elif days_old < 60:
            # Factor in salesperson skill
            if random.random() < archetype["close_rate"] * 0.6:
                status = random.choice([LEAD_STATUS_PROPOSAL, LEAD_STATUS_NEGOTIATION, LEAD_STATUS_WON])
            else:
                status = random.choice([LEAD_STATUS_QUALIFIED, LEAD_STATUS_PROPOSAL, LEAD_STATUS_LOST])
        else:
            # Older leads mostly closed
            if random.random() < archetype["close_rate"]:
                status = LEAD_STATUS_WON
            elif random.random() < 0.6:
                status = LEAD_STATUS_LOST
            else:
                status = random.choice([LEAD_STATUS_PROPOSAL, LEAD_STATUS_NEGOTIATION])

        # Deal value based on industry and salesperson skill
        base_value = random.uniform(industry_data["min"], industry_data["max"])
        deal_value = Decimal(str(round(base_value * archetype["deal_mult"], 2)))

        # Closed date for won/lost leads
        closed_at = None
        if status in [LEAD_STATUS_WON, LEAD_STATUS_LOST]:
            close_days = random.randint(14, min(90, days_old))
            closed_at = created_at + timedelta(days=close_days)

        # Notes
        notes_templates = [
            None,
            f"Interested in {industry} solution.",
            f"Found us via {source}.",
            f"Company size: {random.randint(10, 500)} employees.",
            f"Budget range: ${industry_data['min']:,} - ${industry_data['max']:,}",
            f"Timeline: Q{random.randint(1, 4)} {now.year}",
            f"Current solution: {random.choice(['Spreadsheets', 'Competitor', 'Manual process', 'None'])}",
        ]

        lead = Lead(
            name=f"{first} {last}",
            first_name=first,
            last_name=last,
            email=generate_email(first, last, company),
            phone=generate_phone() if random.random() > 0.15 else None,
            company=company,
            source=source,
            notes=random.choice(notes_templates),
            status=status,
            deal_value=deal_value if status != LEAD_STATUS_NEW else None,
            closed_at=closed_at,
            assigned_user_id=user.id,
            organization_id=org.id,
            created_at=created_at,
            updated_at=created_at + timedelta(days=random.randint(0, max(1, days_old))),
        )
        db.add(lead)
        leads.append(lead)

        # Commit in batches
        if (i + 1) % 100 == 0:
            db.commit()
            print(f"    Created {i + 1}/{count} leads...")

    db.commit()
    return leads


def create_activities(db: Session, org: Organization, leads: list, salespeople: list) -> int:
    """Create realistic activity history for leads."""
    activity_count = 0
    sp_lookup = {user.id: archetype for user, sp, archetype in salespeople}
    now = datetime.utcnow()

    # Activity count by status
    status_activity_range = {
        LEAD_STATUS_NEW: (0, 3),
        LEAD_STATUS_CONTACTED: (2, 6),
        LEAD_STATUS_QUALIFIED: (4, 10),
        LEAD_STATUS_PROPOSAL: (6, 15),
        LEAD_STATUS_NEGOTIATION: (8, 20),
        LEAD_STATUS_WON: (10, 25),
        LEAD_STATUS_LOST: (4, 12),
    }

    for lead in leads:
        if not lead.assigned_user_id:
            continue

        archetype = sp_lookup.get(lead.assigned_user_id, {"activity_mult": 1.0})
        min_acts, max_acts = status_activity_range.get(lead.status, (1, 5))
        num_activities = int(random.randint(min_acts, max_acts) * archetype["activity_mult"])

        lead_created = lead.created_at

        for _ in range(num_activities):
            # Choose activity type (weighted)
            activity_types = list(ACTIVITY_CONFIG.keys())
            weights = [ACTIVITY_CONFIG[t]["weight"] for t in activity_types]
            activity_type = random.choices(activity_types, weights=weights, k=1)[0]
            config = ACTIVITY_CONFIG[activity_type]

            # Activity date (between lead creation and now)
            activity_date = random_date(lead_created, now)

            # Subject and outcome
            subject = random.choice(config["subjects"])
            # Simple template replacement
            subject = subject.replace("{company}", lead.company or "the company")
            subject = subject.replace("{industry}", "your industry")

            outcome = random.choice(config["outcomes"]) if config["outcomes"] else None

            # Duration for calls/meetings
            duration = None
            if "duration_range" in config:
                duration = random.randint(*config["duration_range"])

            activity = LeadActivity(
                lead_id=lead.id,
                user_id=lead.assigned_user_id,
                organization_id=org.id,
                activity_type=activity_type,
                subject=subject,
                duration_minutes=duration,
                outcome=outcome,
                activity_at=activity_date,
                created_at=activity_date,
            )
            db.add(activity)
            activity_count += 1

        # Commit in batches
        if activity_count % 500 == 0:
            db.commit()

    db.commit()
    return activity_count


def print_summary(org: Organization, leads: list, activity_count: int):
    """Print summary statistics."""
    won = [l for l in leads if l.status == LEAD_STATUS_WON]
    lost = [l for l in leads if l.status == LEAD_STATUS_LOST]
    pipeline = [l for l in leads if l.status not in [LEAD_STATUS_WON, LEAD_STATUS_LOST]]

    total_revenue = sum(float(l.deal_value or 0) for l in won)
    avg_deal = total_revenue / len(won) if won else 0

    print("\n" + "=" * 60)
    print("SUMMARY - Test Data Generated")
    print("=" * 60)
    print(f"Organization: {org.name} (ID: {org.id})")
    print(f"\nLEADS:")
    print(f"  Total: {len(leads):,}")
    print(f"  Won: {len(won):,} ({len(won)/len(leads)*100:.1f}%)")
    print(f"  Lost: {len(lost):,} ({len(lost)/len(leads)*100:.1f}%)")
    print(f"  In Pipeline: {len(pipeline):,}")
    print(f"\nREVENUE:")
    print(f"  Total (Won): ${total_revenue:,.2f}")
    print(f"  Avg Deal Size: ${avg_deal:,.2f}")
    print(f"\nACTIVITIES:")
    print(f"  Total: {activity_count:,}")
    print(f"  Avg per Lead: {activity_count/len(leads):.1f}")

    # Source breakdown
    print(f"\nLEAD SOURCES:")
    source_counts = {}
    for l in leads:
        source_counts[l.source] = source_counts.get(l.source, 0) + 1
    for source, count in sorted(source_counts.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count:,} ({count/len(leads)*100:.1f}%)")

    print("\n" + "=" * 60)
    print("Test data ready! Refresh your dashboard to see the visualizations.")
    print("=" * 60)


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Seed realistic test data for Site2CRM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/seed_test_user.py                    # Default: 800 leads, 12 months
  python scripts/seed_test_user.py --leads 1500      # More data
  python scripts/seed_test_user.py --clear           # Clear and reseed
  python scripts/seed_test_user.py --org-id 2        # Specific organization
        """
    )
    parser.add_argument("--org-id", type=int, default=1, help="Organization ID to seed data for (default: 1)")
    parser.add_argument("--leads", type=int, default=800, help="Number of leads to create (default: 800)")
    parser.add_argument("--salespeople", type=int, default=6, help="Number of salespeople (default: 6)")
    parser.add_argument("--months", type=int, default=12, help="Months of historical data (default: 12)")
    parser.add_argument("--clear", action="store_true", help="Clear existing leads/activities first")

    args = parser.parse_args()

    print("=" * 60)
    print("Site2CRM - Test Data Generator")
    print("=" * 60)
    print(f"Configuration:")
    print(f"  Organization ID: {args.org_id}")
    print(f"  Leads: {args.leads:,}")
    print(f"  Salespeople: {args.salespeople}")
    print(f"  Time Range: {args.months} months")
    print()

    # Initialize database
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Verify organization exists
        print("Checking organization...")
        org = ensure_org_exists(db, args.org_id)
        print(f"  Found: {org.name}")

        # Clear existing data if requested
        if args.clear:
            print("\nClearing existing data...")
            deleted_activities = db.query(LeadActivity).filter(LeadActivity.organization_id == org.id).delete()
            deleted_leads = db.query(Lead).filter(Lead.organization_id == org.id).delete()
            db.commit()
            print(f"  Deleted {deleted_leads:,} leads and {deleted_activities:,} activities")

        # Create salespeople
        print(f"\nCreating {args.salespeople} salespeople...")
        salespeople = create_salespeople(db, org, args.salespeople)

        # Create leads
        print(f"\nCreating {args.leads:,} leads...")
        leads = create_leads(db, org, salespeople, args.leads, args.months)

        # Create activities
        print("\nCreating activities...")
        activity_count = create_activities(db, org, leads, salespeople)
        print(f"  Created {activity_count:,} activities")

        # Print summary
        print_summary(org, leads, activity_count)

    finally:
        db.close()


if __name__ == "__main__":
    main()
