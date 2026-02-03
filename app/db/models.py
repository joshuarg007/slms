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

    users = relationship("User", back_populates="organization", foreign_keys="[User.organization_id]")
    leads = relationship("Lead", back_populates="organization")

    stripe_customer_id = Column(String, index=True, nullable=True)
    stripe_subscription_id = Column(String, index=True, nullable=True)
    paypal_subscription_id = Column(String, index=True, nullable=True)
    plan = Column(String, nullable=False, default="free")  # free, trial, starter, appsumo, pro, pro_ai, enterprise
    plan_source = Column(String(20), nullable=False, default="stripe")  # stripe, paypal, appsumo, manual
    billing_cycle = Column(String, nullable=False, default="monthly")  # monthly, annual, lifetime
    subscription_status = Column(String, nullable=False, default="inactive")  # inactive, trialing, active, past_due, canceled
    current_period_end = Column(DateTime, nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)
    trial_started_at = Column(DateTime, nullable=True)
    onboarding_completed = Column(Boolean, nullable=False, default=False)
    team_size = Column(String(20), nullable=True)  # "just_me", "2-5", "6-20", "20+"
    leads_this_month = Column(Integer, nullable=False, default=0)
    leads_month_reset = Column(DateTime, nullable=True)  # When to reset the counter

    # Usage alert tracking (reset monthly with leads_month_reset)
    usage_alert_80_sent = Column(Boolean, nullable=False, default=False)
    usage_alert_100_sent = Column(Boolean, nullable=False, default=False)

    # AI usage tracking
    ai_messages_this_month = Column(Integer, nullable=False, default=0)
    ai_messages_month_reset = Column(DateTime, nullable=True)

    # "hubspot" | "pipedrive" | "salesforce" (stringly-typed; validated at app layer)
    active_crm = Column(String(20), nullable=False, default="hubspot")

    # AppSumo addendum acceptance (organization-level)
    appsumo_code = Column(String(100), nullable=True, unique=True, index=True)  # The redeemed code
    appsumo_addendum_accepted = Column(Boolean, nullable=False, default=False)
    appsumo_addendum_version = Column(String(10), nullable=True)  # e.g., "1.0"
    appsumo_addendum_accepted_at = Column(DateTime, nullable=True)
    appsumo_addendum_accepted_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


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

    # Lead source tracking (UTM params, referrer, landing page)
    utm_source = Column(String(100), nullable=True, index=True)  # e.g., google, facebook, newsletter
    utm_medium = Column(String(100), nullable=True, index=True)  # e.g., cpc, email, social
    utm_campaign = Column(String(255), nullable=True)  # e.g., spring_sale, product_launch
    utm_term = Column(String(255), nullable=True)  # Paid search keyword
    utm_content = Column(String(255), nullable=True)  # A/B test or ad variant
    referrer_url = Column(String(2048), nullable=True)  # Full referrer URL
    landing_page_url = Column(String(2048), nullable=True)  # URL where form was submitted

    # A/B test tracking
    form_variant_id = Column(
        Integer,
        ForeignKey("form_variants.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

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

    # Cookie consent - tracked per user for compliance
    cookie_consent_at = Column(DateTime, nullable=True)

    # AppSumo addendum acceptance (user-level audit trail)
    accepted_appsumo_addendum_at = Column(DateTime, nullable=True)
    accepted_appsumo_addendum_version = Column(String(10), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Security: Account lockout after failed attempts
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(45), nullable=True)  # IPv6 max length

    # Enforce tenancy at the model level too
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    organization = relationship("Organization", back_populates="users", foreign_keys=[organization_id])


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
    """Stores embeddable form configuration - multiple forms per organization allowed."""

    __tablename__ = "form_configs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Unique form identifier (used in embed codes)
    form_key = Column(String(50), unique=True, nullable=True, index=True)

    # Form name for identification in dashboard
    name = Column(String(255), nullable=False, default="Default Form")

    # "inline" | "wizard" | "modal" | "drawer"
    form_style = Column(String(20), nullable=False, default="inline")

    # JSON blob for fields, styling, branding, etc.
    config_json = Column(Text, nullable=False, default="{}")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", backref="form_configs")


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


# AppSumo code status constants
APPSUMO_CODE_UNUSED = "unused"
APPSUMO_CODE_REDEEMED = "redeemed"
APPSUMO_CODE_REVOKED = "revoked"

APPSUMO_CODE_STATUSES = [
    APPSUMO_CODE_UNUSED,
    APPSUMO_CODE_REDEEMED,
    APPSUMO_CODE_REVOKED,
]


class AppSumoCode(Base):
    """AppSumo lifetime license codes."""

    __tablename__ = "appsumo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(20), nullable=False, default=APPSUMO_CODE_UNUSED, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    redeemed_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    # Redemption tracking
    redeemed_by_org_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    redeemed_by_org = relationship("Organization", backref="appsumo_code_record")

    # Revocation reason (for audit)
    revoked_reason = Column(String(255), nullable=True)

    # Optional: batch identifier for bulk imports
    batch_id = Column(String(50), nullable=True, index=True)


# A/B Test status constants
AB_TEST_STATUS_DRAFT = "draft"
AB_TEST_STATUS_RUNNING = "running"
AB_TEST_STATUS_PAUSED = "paused"
AB_TEST_STATUS_COMPLETED = "completed"

AB_TEST_STATUSES = [
    AB_TEST_STATUS_DRAFT,
    AB_TEST_STATUS_RUNNING,
    AB_TEST_STATUS_PAUSED,
    AB_TEST_STATUS_COMPLETED,
]


class ABTest(Base):
    """A/B test for form variants."""

    __tablename__ = "ab_tests"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=AB_TEST_STATUS_DRAFT, index=True)

    # Test period
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    # Goal tracking
    goal_type = Column(String(20), nullable=False, default="conversions")  # conversions, impressions

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", backref="ab_tests")
    variants = relationship("FormVariant", back_populates="ab_test", cascade="all, delete-orphan")


# Chat Widget tone options
CHAT_TONE_FRIENDLY = "friendly"
CHAT_TONE_PROFESSIONAL = "professional"
CHAT_TONE_CASUAL = "casual"

CHAT_TONES = [CHAT_TONE_FRIENDLY, CHAT_TONE_PROFESSIONAL, CHAT_TONE_CASUAL]

# Primary goals for chat widget
CHAT_GOAL_CAPTURE_EMAIL = "capture_email"
CHAT_GOAL_BOOK_DEMO = "book_demo"
CHAT_GOAL_START_TRIAL = "start_trial"
CHAT_GOAL_GET_QUOTE = "get_quote"
CHAT_GOAL_CAPTURE_PHONE = "capture_phone"
CHAT_GOAL_SUPPORT_ONLY = "support_only"
CHAT_GOALS = [
    CHAT_GOAL_CAPTURE_EMAIL,
    CHAT_GOAL_BOOK_DEMO,
    CHAT_GOAL_START_TRIAL,
    CHAT_GOAL_GET_QUOTE,
    CHAT_GOAL_CAPTURE_PHONE,
    CHAT_GOAL_SUPPORT_ONLY,
]

# Persistence levels for chat widget
CHAT_PERSISTENCE_SOFT = "soft"
CHAT_PERSISTENCE_MEDIUM = "medium"
CHAT_PERSISTENCE_AGGRESSIVE = "aggressive"
CHAT_PERSISTENCE_LEVELS = [CHAT_PERSISTENCE_SOFT, CHAT_PERSISTENCE_MEDIUM, CHAT_PERSISTENCE_AGGRESSIVE]


class ChatWidgetConfig(Base):
    """AI chat widget configuration - multiple widgets per organization allowed."""

    __tablename__ = "chat_widget_configs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Unique widget identifier (used in embed codes)
    widget_key = Column(String(50), unique=True, nullable=False, index=True)

    # Setup wizard fields
    business_name = Column(String(255), nullable=False)
    business_description = Column(Text, nullable=False)
    services = Column(Text, nullable=False)  # Comma-separated or newline-separated
    restrictions = Column(Text, nullable=True)  # What the bot should never say
    cta = Column(String(255), nullable=False, default="Free 15-minute consultation")
    contact_email = Column(String(255), nullable=False)
    tone = Column(String(20), nullable=False, default=CHAT_TONE_FRIENDLY)
    extra_context = Column(Text, nullable=True)  # Additional instructions

    # Goal and behavior settings
    primary_goal = Column(String(30), nullable=False, default=CHAT_GOAL_CAPTURE_EMAIL)
    goal_url = Column(String(2048), nullable=True)  # Calendly link, signup URL, etc.
    rebuttal_count = Column(Integer, nullable=False, default=5)  # 1-10
    persistence_level = Column(String(20), nullable=False, default=CHAT_PERSISTENCE_MEDIUM)
    welcome_message = Column(String(500), nullable=True)  # Custom first message
    success_message = Column(Text, nullable=True)  # Message after capturing contact info
    collect_phone = Column(Boolean, nullable=False, default=False)
    collect_name = Column(Boolean, nullable=False, default=True)
    collect_company = Column(Boolean, nullable=False, default=False)
    quick_replies = Column(Text, nullable=True)  # JSON array of quick reply buttons

    # Widget appearance
    primary_color = Column(String(7), nullable=False, default="#4f46e5")  # Hex color
    widget_position = Column(String(20), nullable=False, default="bottom-right")  # bottom-right, bottom-left
    bubble_icon = Column(String(20), nullable=False, default="chat")  # chat, message, support, robot, sparkle, wave

    # Advanced appearance
    header_title = Column(String(100), nullable=True)  # Override business_name in header
    header_subtitle = Column(String(100), nullable=True)  # e.g. "Online now", "Here to help"
    chat_bg_color = Column(String(7), nullable=True)  # Chat area background
    user_bubble_color = Column(String(7), nullable=True)  # User message color
    bot_bubble_color = Column(String(7), nullable=True)  # Bot message color
    button_size = Column(String(10), nullable=False, default="medium")  # small, medium, large
    show_branding = Column(Boolean, nullable=False, default=True)  # Show "Powered by Site2CRM"
    button_shape = Column(String(20), nullable=False, default="bubble")  # bubble, pill, square, tab, bar
    gradient_type = Column(String(20), nullable=False, default="none")  # none, sunset, ocean, forest, etc.
    gradient_color_1 = Column(String(7), nullable=True)
    gradient_color_2 = Column(String(7), nullable=True)
    gradient_color_3 = Column(String(7), nullable=True)
    gradient_angle = Column(Integer, nullable=False, default=135)
    button_opacity = Column(Float, nullable=False, default=1.0)
    blur_background = Column(Boolean, nullable=False, default=False)
    attention_effect = Column(String(20), nullable=False, default="none")  # none, pulse, bounce, glow, shake, ring
    shadow_style = Column(String(20), nullable=False, default="elevated")  # none, subtle, elevated, dramatic, glow
    entry_animation = Column(String(20), nullable=False, default="scale")  # none, fade, slide, scale, bounce

    # State
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", backref="chat_widget_configs")
    conversations = relationship("ChatWidgetConversation", back_populates="config", cascade="all, delete-orphan")


class ChatWidgetConversation(Base):
    """Visitor conversations from the embeddable chat widget."""

    __tablename__ = "chat_widget_conversations"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(
        Integer,
        ForeignKey("chat_widget_configs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Visitor tracking (no user_id - these are anonymous visitors)
    session_id = Column(String(100), nullable=False, index=True)  # Browser session ID
    page_url = Column(String(2048), nullable=True)  # Where the chat happened

    # Lead capture
    lead_email = Column(String(255), nullable=True, index=True)
    lead_name = Column(String(255), nullable=True)
    lead_phone = Column(String(50), nullable=True)
    lead_captured_at = Column(DateTime, nullable=True)

    # Conversation data
    transcript = Column(Text, nullable=False, default="[]")  # JSON array of messages
    message_count = Column(Integer, nullable=False, default=0)

    # Token tracking for cost analysis
    total_tokens_input = Column(Integer, nullable=False, default=0)
    total_tokens_output = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    config = relationship("ChatWidgetConfig", back_populates="conversations")


class FormVariant(Base):
    """A variant in an A/B test with config overrides."""

    __tablename__ = "form_variants"

    id = Column(Integer, primary_key=True, index=True)
    ab_test_id = Column(
        Integer,
        ForeignKey("ab_tests.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name = Column(String(50), nullable=False)  # e.g., "Control", "Variant A"
    is_control = Column(Boolean, nullable=False, default=False)

    # Traffic weight (percentage, 0-100)
    weight = Column(Integer, nullable=False, default=50)

    # Config overrides (JSON) - only the fields that differ from base config
    # e.g., {"branding": {"headerText": "Get Started Today!"}}
    config_overrides = Column(Text, nullable=False, default="{}")

    # Performance metrics (denormalized for fast reads)
    impressions = Column(Integer, nullable=False, default=0)
    conversions = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    ab_test = relationship("ABTest", back_populates="variants")


# Webhook event types
WEBHOOK_EVENT_LEAD_CREATED = "lead.created"
WEBHOOK_EVENT_LEAD_UPDATED = "lead.updated"
WEBHOOK_EVENT_FORM_SUBMITTED = "form.submitted"
WEBHOOK_EVENT_CHAT_STARTED = "chat.started"
WEBHOOK_EVENT_CHAT_LEAD_CAPTURED = "chat.lead_captured"

WEBHOOK_EVENTS = [
    WEBHOOK_EVENT_LEAD_CREATED,
    WEBHOOK_EVENT_LEAD_UPDATED,
    WEBHOOK_EVENT_FORM_SUBMITTED,
    WEBHOOK_EVENT_CHAT_STARTED,
    WEBHOOK_EVENT_CHAT_LEAD_CAPTURED,
]


class Webhook(Base):
    """Webhook subscriptions for Zapier and other integrations."""

    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Webhook configuration
    url = Column(String(2048), nullable=False)  # Target URL to POST to
    event = Column(String(50), nullable=False, index=True)  # lead.created, form.submitted, etc.
    secret = Column(String(100), nullable=True)  # Shared secret for signature verification

    # State
    is_active = Column(Boolean, nullable=False, default=True)

    # Metadata
    description = Column(String(255), nullable=True)  # Optional description
    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Delivery stats (denormalized for fast reads)
    total_deliveries = Column(Integer, nullable=False, default=0)
    successful_deliveries = Column(Integer, nullable=False, default=0)
    failed_deliveries = Column(Integer, nullable=False, default=0)
    last_delivery_at = Column(DateTime, nullable=True)
    last_success_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    last_failure_reason = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization", backref="webhooks")
    created_by = relationship("User", backref="created_webhooks")
    deliveries = relationship("WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")

    __table_args__ = (
        # Unique constraint: one webhook per URL+event per org
        UniqueConstraint("organization_id", "url", "event", name="uq_org_url_event"),
    )


class WebhookDelivery(Base):
    """Log of webhook delivery attempts for debugging."""

    __tablename__ = "webhook_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(
        Integer,
        ForeignKey("webhooks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Delivery details
    event = Column(String(50), nullable=False)  # Event type at time of delivery
    payload = Column(Text, nullable=False)  # JSON payload sent
    response_status = Column(Integer, nullable=True)  # HTTP status code
    response_body = Column(Text, nullable=True)  # Response body (truncated)
    error_message = Column(String(500), nullable=True)  # Error if delivery failed

    # Timing
    delivered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_ms = Column(Integer, nullable=True)  # Response time in milliseconds

    # Retry tracking
    attempt_number = Column(Integer, nullable=False, default=1)
    is_success = Column(Boolean, nullable=False, default=False)

    webhook = relationship("Webhook", back_populates="deliveries")


# ============================================================================
# OAuth 2.0 Models (for Zapier and other integrations)
# ============================================================================

class OAuthClient(Base):
    """Registered OAuth applications (e.g., Zapier)."""

    __tablename__ = "oauth_clients"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(100), unique=True, nullable=False, index=True)
    client_secret = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "Zapier"
    redirect_uris = Column(Text, nullable=False)  # JSON array of allowed redirect URIs
    scopes = Column(Text, nullable=False, default="read write")  # Space-separated scopes

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tokens = relationship("OAuthToken", back_populates="client", cascade="all, delete-orphan")


class OAuthToken(Base):
    """OAuth access and refresh tokens."""

    __tablename__ = "oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer,
        ForeignKey("oauth_clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Tokens
    access_token = Column(String(100), unique=True, nullable=False, index=True)
    refresh_token = Column(String(100), unique=True, nullable=True, index=True)
    token_type = Column(String(20), nullable=False, default="Bearer")
    scopes = Column(Text, nullable=False, default="read write")

    # Expiration
    access_token_expires_at = Column(DateTime, nullable=False)
    refresh_token_expires_at = Column(DateTime, nullable=True)

    # Authorization code (used during OAuth flow, cleared after exchange)
    authorization_code = Column(String(100), unique=True, nullable=True, index=True)
    authorization_code_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    client = relationship("OAuthClient", back_populates="tokens")
    user = relationship("User", backref="oauth_tokens")
    organization = relationship("Organization", backref="oauth_tokens")
