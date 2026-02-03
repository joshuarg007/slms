"""add webhooks tables for Zapier integration

Revision ID: l9g0h1i2j3k4
Revises: k8f9g0h1i2j3
Create Date: 2026-02-02

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'l9g0h1i2j3k4'
down_revision = 'k8f9g0h1i2j3'
branch_labels = None
depends_on = None


def upgrade():
    # Create webhooks table
    op.create_table(
        'webhooks',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('url', sa.String(2048), nullable=False),
        sa.Column('event', sa.String(50), nullable=False, index=True),
        sa.Column('secret', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        # Delivery stats
        sa.Column('total_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_delivery_at', sa.DateTime(), nullable=True),
        sa.Column('last_success_at', sa.DateTime(), nullable=True),
        sa.Column('last_failure_at', sa.DateTime(), nullable=True),
        sa.Column('last_failure_reason', sa.String(500), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Unique constraint: one webhook per URL+event per org
        sa.UniqueConstraint('organization_id', 'url', 'event', name='uq_org_url_event'),
    )

    # Create webhook_deliveries table (for debugging/logs)
    op.create_table(
        'webhook_deliveries',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('webhook_id', sa.Integer(), sa.ForeignKey('webhooks.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('event', sa.String(50), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_success', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade():
    op.drop_table('webhook_deliveries')
    op.drop_table('webhooks')
