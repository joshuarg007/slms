"""Add chat widget booking integration

Revision ID: p3k4l5m6n7o8
Revises: o2j3k4l5m6n7
Create Date: 2026-02-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'p3k4l5m6n7o8'
down_revision = 'o2j3k4l5m6n7'
branch_labels = None
depends_on = None


def upgrade():
    # Add booking_config_id to chat_widget_configs to link with booking page
    op.add_column(
        'chat_widget_configs',
        sa.Column('booking_config_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_chat_widget_booking_config',
        'chat_widget_configs',
        'booking_configs',
        ['booking_config_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add booking_enabled flag (separate from primary_goal to allow booking as secondary)
    op.add_column(
        'chat_widget_configs',
        sa.Column('booking_enabled', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade():
    op.drop_constraint('fk_chat_widget_booking_config', 'chat_widget_configs', type_='foreignkey')
    op.drop_column('chat_widget_configs', 'booking_config_id')
    op.drop_column('chat_widget_configs', 'booking_enabled')
