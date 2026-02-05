"""Add booking/scheduling tables.

Revision ID: o2j3k4l5m6n7
Revises: n1i2j3k4l5m6
Create Date: 2026-02-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "o2j3k4l5m6n7"
down_revision = "n1i2j3k4l5m6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Booking configs - main settings per org
    op.create_table(
        "booking_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("welcome_message", sa.Text(), nullable=True),
        sa.Column("primary_color", sa.String(7), server_default="#6366f1"),
        sa.Column("timezone", sa.String(50), server_default="America/New_York"),
        sa.Column("booking_window_days", sa.Integer(), server_default="30"),
        sa.Column("min_notice_hours", sa.Integer(), server_default="4"),
        sa.Column("buffer_minutes", sa.Integer(), server_default="15"),
        sa.Column("is_active", sa.Boolean(), server_default="1"),
        sa.Column("google_calendar_id", sa.String(255), nullable=True),
        sa.Column("google_refresh_token", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_booking_configs_id", "booking_configs", ["id"])
    op.create_index("ix_booking_configs_organization_id", "booking_configs", ["organization_id"])
    op.create_index("ix_booking_configs_slug", "booking_configs", ["slug"], unique=True)

    # Meeting types (15min intro, 30min call, etc.)
    op.create_table(
        "meeting_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_config_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("color", sa.String(7), server_default="#6366f1"),
        sa.Column("is_active", sa.Boolean(), server_default="1"),
        sa.Column("order_index", sa.Integer(), server_default="0"),
        sa.Column("collect_phone", sa.Boolean(), server_default="0"),
        sa.Column("collect_company", sa.Boolean(), server_default="1"),
        sa.Column("custom_questions", sa.JSON(), nullable=True),
        sa.Column("location_type", sa.String(20), server_default="google_meet"),
        sa.Column("custom_location", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["booking_config_id"], ["booking_configs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_meeting_types_id", "meeting_types", ["id"])
    op.create_index("ix_meeting_types_booking_config_id", "meeting_types", ["booking_config_id"])

    # Availability rules (working hours)
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_config_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=False),
        sa.Column("end_time", sa.String(5), nullable=False),
        sa.Column("is_available", sa.Boolean(), server_default="1"),
        sa.ForeignKeyConstraint(["booking_config_id"], ["booking_configs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_availability_rules_id", "availability_rules", ["id"])
    op.create_index("ix_availability_rules_booking_config_id", "availability_rules", ["booking_config_id"])

    # Blocked dates (holidays, PTO)
    op.create_table(
        "blocked_dates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_config_id", sa.Integer(), nullable=False),
        sa.Column("blocked_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.ForeignKeyConstraint(["booking_config_id"], ["booking_configs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_blocked_dates_id", "blocked_dates", ["id"])
    op.create_index("ix_blocked_dates_booking_config_id", "blocked_dates", ["booking_config_id"])

    # Bookings (actual scheduled meetings)
    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_type_id", sa.Integer(), nullable=False),
        sa.Column("lead_id", sa.Integer(), nullable=True),
        sa.Column("guest_name", sa.String(255), nullable=False),
        sa.Column("guest_email", sa.String(255), nullable=False),
        sa.Column("guest_phone", sa.String(50), nullable=True),
        sa.Column("guest_company", sa.String(255), nullable=True),
        sa.Column("guest_notes", sa.Text(), nullable=True),
        sa.Column("custom_answers", sa.JSON(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("timezone", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), server_default="confirmed"),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("google_event_id", sa.String(255), nullable=True),
        sa.Column("meeting_link", sa.String(500), nullable=True),
        sa.Column("source", sa.String(50), server_default="booking_page"),
        sa.Column("cancel_token", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["meeting_type_id"], ["meeting_types.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bookings_id", "bookings", ["id"])
    op.create_index("ix_bookings_meeting_type_id", "bookings", ["meeting_type_id"])
    op.create_index("ix_bookings_lead_id", "bookings", ["lead_id"])
    op.create_index("ix_bookings_cancel_token", "bookings", ["cancel_token"])

    # Booking reminders
    op.create_table(
        "booking_reminders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("reminder_type", sa.String(20), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_booking_reminders_id", "booking_reminders", ["id"])
    op.create_index("ix_booking_reminders_booking_id", "booking_reminders", ["booking_id"])


def downgrade() -> None:
    op.drop_table("booking_reminders")
    op.drop_table("bookings")
    op.drop_table("blocked_dates")
    op.drop_table("availability_rules")
    op.drop_table("meeting_types")
    op.drop_table("booking_configs")
