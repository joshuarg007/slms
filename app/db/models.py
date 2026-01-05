from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


# Lead status constants
LEAD_STATUS_NEW = "new"
LEAD_STATUS_CONTACTED = "contacted"
LEAD_STATUS_QUALIFIED = "qualified"
LEAD_STATUS_PROPOSAL = "proposal"
LEAD_STATUS_NEGOTIATION = "negotiation"
LEAD_STATUS_WON = "won"
LEAD_STATUS_LOST = "lost"

LEAD_STATUSES = [
    LEAD_STATUS_NEW,
    LEAD_STATUS_CONTACTED,
    LEAD_STATUS_QUALIFIED,
    LEAD_STATUS_PROPOSAL,
    LEAD_STATUS_NEGOTIATION,
    LEAD_STATUS_WON,
    LEAD_STATUS_LOST,
]

# Activity type constants
ACTIVITY_CALL = "call"
ACTIVITY_EMAIL = "email"
ACTIVITY_MEETING = "meeting"
ACTIVITY_NOTE = "note"

ACTIVITY_TYPES = [ACTIVITY_CALL, ACTIVITY_EMAIL, ACTIVITY_MEETING, ACTIVITY_NOTE]


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    domain = Column(String, nullable=False, unique=True, index=True)
    api_key = Column(String, nullable=True, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="organization")
    leads = relationship("Lead", back_populates="organization")

    stripe_customer_id = Column(String, index=True, nullable=True)
    stripe_subscription_id = Column(String, index=True, nullable=True)
    plan = Column(String, nullable=False, default="free")  # free, trial, starter, pro, pro_ai, enterprise
    billing_cycle = Column(String, nullable=False, default="monthly")  # monthly, annual
    subscription_status = Column(String, nullable=False, default="inactive")  # inactive, trialing, active, past_due, canceled
    current_period_end = Column(DateTime, nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)
    trial_started_at = Column(DateTime, nullable=True)
    onboarding_completed = Column(Boolean, nullable=False, default=False)
    team_size = Column(String(20), nullable=True)  # "just_me", "2-5", "6-20", "20+"
    leads_this_month = Column(Integer, nullable=False, default=0)
    leads_month_reset = Column(DateTime, nullable=True)  # When to reset the counter

    # AI usage tracking
    ai_messages_this_month = Column(Integer, nullable=False, default=0)
    ai_messages_month_reset = Column(DateTime, nullable=True)

    # "hubspot" | "pipedrive" | "salesforce" (stringly-typed; validated at app layer)
    active_crm = Column(String(20), nullable=False, default="hubspot")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Lead pipeline fields
    status = Column(String(20), nullable=False, default=LEAD_STATUS_NEW, index=True)
    deal_value = Column(Numeric(12, 2), nullable=True)  # Potential or actual deal value
    closed_at = Column(DateTime, nullable=True)  # When deal was won/lost

    # AI Lead Scoring (0-100)
    score = Column(Integer, nullable=True, index=True)  # Total score
    score_engagement = Column(Integer, nullable=True)  # Engagement component
    score_source = Column(Integer, nullable=True)  # Source quality component
    score_value = Column(Integer, nullable=True)  # Deal value component
    score_velocity = Column(Integer, nullable=True)  # Pipeline velocity component
    score_fit = Column(Integer, nullable=True)  # Profile fit component
    win_probability = Column(Integer, nullable=True)  # Predicted win % (0-100)
    score_updated_at = Column(DateTime, nullable=True)  # When score was last calculated

    # Assigned salesperson
    assigned_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    assigned_user = relationship("User", backref="assigned_leads", foreign_keys=[assigned_user_id])

    # Enforce tenancy at the model level too
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    organization = relationship("Organization", back_populates="leads")

    # Activities relationship
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Role: OWNER, ADMIN, USER, READ_ONLY
    role = Column(String(20), nullable=False, default="USER")

    # Default user for organization (for integrations, notifications, etc.)
    is_default = Column(Boolean, nullable=False, default=False)

    # Approval status - first user (OWNER) auto-approved, others need owner approval
    is_approved = Column(Boolean, nullable=False, default=False)

    # Email verification
    email_verified = Column(Boolean, nullable=False, default=False)
    email_verification_token = Column(String(100), nullable=True, index=True)
    email_verification_sent_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Enforce tenancy at the model level too
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    organization = relationship("Organization", back_populates="users")


class IntegrationCredential(Base):
    __tablename__ = "integration_credentials"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    # e.g. "hubspot", "pipedrive", "salesforce", "nutshell"
    provider = Column(String(50), nullable=False, index=True)

    # "pat" (private app token), "api_key", or "oauth"
    auth_type = Column(String(20), nullable=False, default="pat")

    # For PAT/API key: store here. For OAuth: also use refresh_token + expires_at.
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Optional serialized metadata (e.g., scopes, instance_url, etc.)
    scopes = Column(Text, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FormConfig(Base):
    """Stores embeddable form configuration per organization."""

    __tablename__ = "form_configs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        unique=True,  # One form config per org
        index=True,
        nullable=False,
    )

    # "inline" | "wizard" | "modal" | "drawer"
    form_style = Column(String(20), nullable=False, default="inline")

    # JSON blob for fields, styling, branding, etc.
    config_json = Column(Text, nullable=False, default="{}")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", backref="form_config")


class SalespersonDailyStats(Base):
    __tablename__ = "salesperson_daily_stats"

    id = Column(Integer, primary_key=True, index=True)

    # Multitenant + CRM provider
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    provider = Column(String(50), nullable=False, index=True)  # "hubspot" | "pipedrive" | "salesforce" | "nutshell"

    # Owner identity as seen in the CRM
    owner_id = Column(String(100), nullable=False, index=True)
    owner_email = Column(String(255), nullable=True)
    owner_name = Column(String(255), nullable=True)

    # Day bucket in UTC
    stats_date = Column(Date, nullable=False, index=True)

    # KPIs (aligned with your existing stats responses)
    emails_count = Column(Integer, nullable=False, default=0)
    calls_count = Column(Integer, nullable=False, default=0)
    meetings_count = Column(Integer, nullable=False, default=0)
    new_deals_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "provider",
            "owner_id",
            "stats_date",
            name="uq_org_provider_owner_date",
        ),
    )


class NotificationSettings(Base):
    """Notification preferences per organization."""

    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        unique=True,  # One settings record per org
        index=True,
        nullable=False,
    )

    # Real-time alerts
    new_lead = Column(Boolean, nullable=False, default=True)
    crm_error = Column(Boolean, nullable=False, default=True)

    # Digest emails
    daily_digest = Column(Boolean, nullable=False, default=False)
    weekly_digest = Column(Boolean, nullable=False, default=True)
    salesperson_digest = Column(Boolean, nullable=False, default=False)

    # Notification channel (future: slack, webhook, etc.)
    channel = Column(String(20), nullable=False, default="email")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", backref="notification_settings")


class ChatConversation(Base):
    """AI chat conversations per user."""

    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    title = Column(String(255), nullable=True)  # Auto-generated from first message
    context_type = Column(String(50), nullable=False, default="general")  # general, lead_analysis, coaching
    context_id = Column(Integer, nullable=True)  # e.g., lead_id if analyzing specific lead

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", backref="chat_conversations")
    user = relationship("User", backref="chat_conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Individual messages in a chat conversation."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)

    # Token tracking for cost analysis
    tokens_input = Column(Integer, nullable=False, default=0)
    tokens_output = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("ChatConversation", back_populates="messages")


class LeadActivity(Base):
    """Individual activities on leads (calls, emails, meetings)."""

    __tablename__ = "lead_activities"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(
        Integer,
        ForeignKey("leads.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    activity_type = Column(String(20), nullable=False, index=True)  # call, email, meeting, note
    subject = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)  # For calls/meetings
    outcome = Column(String(50), nullable=True)  # completed, no_answer, scheduled, etc.

    activity_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lead = relationship("Lead", back_populates="activities")
    user = relationship("User", backref="lead_activities")
    organization = relationship("Organization", backref="lead_activities")


class Salesperson(Base):
    """Salesperson profile with sales-specific metadata."""

    __tablename__ = "salespeople"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Display name (can differ from user email)
    display_name = Column(String(100), nullable=False)

    # Sales targets
    monthly_quota = Column(Numeric(12, 2), nullable=True)  # Revenue target
    monthly_lead_target = Column(Integer, nullable=True)  # Leads to close

    # Performance tracking
    hire_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="salesperson_profile")
    organization = relationship("Organization", backref="salespeople")
