"""Add multi-booking page support

Revision ID: q4l5m6n7o8p9
Revises: p3k4l5m6n7o8
Create Date: 2026-02-05

"""
from alembic import op
import sqlalchemy as sa
import secrets

# revision identifiers, used by Alembic.
revision = 'q4l5m6n7o8p9'
down_revision = 'p3k4l5m6n7o8'
branch_labels = None
depends_on = None


def generate_booking_key():
    """Generate a unique booking key like bkg_xxx."""
    return f"bkg_{secrets.token_urlsafe(16)}"


def upgrade():
    # Add booking_key column (nullable first for existing rows)
    op.add_column(
        'booking_configs',
        sa.Column('booking_key', sa.String(50), nullable=True, index=True)
    )

    # Add name column for internal management
    op.add_column(
        'booking_configs',
        sa.Column('name', sa.String(100), nullable=True)
    )

    # Backfill existing rows with unique booking_keys and default names
    connection = op.get_bind()
    results = connection.execute(sa.text("SELECT id, business_name FROM booking_configs WHERE booking_key IS NULL"))
    for row in results:
        booking_key = generate_booking_key()
        name = row[1] or "Default Booking Page"  # Use business_name as default name
        connection.execute(
            sa.text("UPDATE booking_configs SET booking_key = :key, name = :name WHERE id = :id"),
            {"key": booking_key, "name": name, "id": row[0]}
        )

    # Now make booking_key NOT NULL and UNIQUE
    op.alter_column('booking_configs', 'booking_key', nullable=False)
    op.create_unique_constraint('uq_booking_configs_booking_key', 'booking_configs', ['booking_key'])

    # Set default for name column
    op.alter_column('booking_configs', 'name', nullable=False, server_default='Default Booking Page')


def downgrade():
    op.drop_constraint('uq_booking_configs_booking_key', 'booking_configs', type_='unique')
    op.drop_column('booking_configs', 'name')
    op.drop_column('booking_configs', 'booking_key')
