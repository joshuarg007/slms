"""add A/B testing tables

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3a4b5c6d7e8'
down_revision = 'e2f3a4b5c6d7'
branch_labels = None
depends_on = None


def upgrade():
    # Create ab_tests table
    op.create_table(
        'ab_tests',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, default='draft', index=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('goal_type', sa.String(20), nullable=False, default='conversions'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create form_variants table
    op.create_table(
        'form_variants',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('ab_test_id', sa.Integer(), sa.ForeignKey('ab_tests.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('is_control', sa.Boolean(), nullable=False, default=False),
        sa.Column('weight', sa.Integer(), nullable=False, default=50),
        sa.Column('config_overrides', sa.Text(), nullable=False, default='{}'),
        sa.Column('impressions', sa.Integer(), nullable=False, default=0),
        sa.Column('conversions', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Add form_variant_id to leads table (using batch mode for SQLite compatibility)
    with op.batch_alter_table('leads', schema=None) as batch_op:
        batch_op.add_column(sa.Column('form_variant_id', sa.Integer(), nullable=True))
        batch_op.create_index('ix_leads_form_variant_id', ['form_variant_id'])
        # Note: Foreign key constraint is defined in the model; SQLite doesn't enforce FK by default


def downgrade():
    with op.batch_alter_table('leads', schema=None) as batch_op:
        batch_op.drop_index('ix_leads_form_variant_id')
        batch_op.drop_column('form_variant_id')
    op.drop_table('form_variants')
    op.drop_table('ab_tests')
