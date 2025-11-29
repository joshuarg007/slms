from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


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
    plan = Column(String, nullable=False, default="free")  # free, trial, starter, pro, enterprise
    billing_cycle = Column(String, nullable=False, default="monthly")  # monthly, annual
    subscription_status = Column(String, nullable=False, default="inactive")  # inactive, trialing, active, past_due, canceled
    current_period_end = Column(DateTime, nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)
    leads_this_month = Column(Integer, nullable=False, default=0)
    leads_month_reset = Column(DateTime, nullable=True)  # When to reset the counter

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

    # Enforce tenancy at the model level too
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    organization = relationship("Organization", back_populates="leads")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Role: OWNER, ADMIN, USER, READ_ONLY
    role = Column(String(20), nullable=False, default="USER")

    # Default user for organization (for integrations, notifications, etc.)
    is_default = Column(Boolean, nullable=False, default=False)

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
