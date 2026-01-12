"""add AppSumo tables and columns

Revision ID: h5c6d7e8f9g0
Revises: g4b5c6d7e8f9
Create Date: 2026-01-12

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h5c6d7e8f9g0'
down_revision = 'g4b5c6d7e8f9'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns to organizations table
    op.add_column('organizations', sa.Column('plan_source', sa.String(20), nullable=False, server_default='stripe'))
    op.add_column('organizations', sa.Column('appsumo_code', sa.String(100), nullable=True))
    op.add_column('organizations', sa.Column('appsumo_addendum_accepted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('organizations', sa.Column('appsumo_addendum_version', sa.String(10), nullable=True))
    op.add_column('organizations', sa.Column('appsumo_addendum_accepted_at', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('appsumo_addendum_accepted_by_user_id', sa.Integer(), nullable=True))
    op.add_column('organizations', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('organizations', sa.Column('team_size', sa.String(20), nullable=True))
    op.add_column('organizations', sa.Column('trial_started_at', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('usage_alert_80_sent', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('organizations', sa.Column('usage_alert_100_sent', sa.Boolean(), nullable=False, server_default='false'))

    # Create indexes
    op.create_index('ix_organizations_appsumo_code', 'organizations', ['appsumo_code'], unique=True)

    # Add foreign key for appsumo_addendum_accepted_by_user_id
    op.create_foreign_key(
        'fk_organizations_appsumo_user',
        'organizations', 'users',
        ['appsumo_addendum_accepted_by_user_id'], ['id'],
        ondelete='SET NULL'
    )

    # Create appsumo_codes table
    op.create_table(
        'appsumo_codes',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('code', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='unused', index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('redeemed_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('redeemed_by_org_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('revoked_reason', sa.String(255), nullable=True),
        sa.Column('batch_id', sa.String(50), nullable=True, index=True),
    )

    # Add AppSumo addendum tracking columns to users table
    op.add_column('users', sa.Column('accepted_appsumo_addendum_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('accepted_appsumo_addendum_version', sa.String(10), nullable=True))


def downgrade():
    # Drop users columns
    op.drop_column('users', 'accepted_appsumo_addendum_version')
    op.drop_column('users', 'accepted_appsumo_addendum_at')

    # Drop appsumo_codes table
    op.drop_table('appsumo_codes')

    # Drop foreign key and index
    op.drop_constraint('fk_organizations_appsumo_user', 'organizations', type_='foreignkey')
    op.drop_index('ix_organizations_appsumo_code', table_name='organizations')

    # Drop organizations columns
    op.drop_column('organizations', 'usage_alert_100_sent')
    op.drop_column('organizations', 'usage_alert_80_sent')
    op.drop_column('organizations', 'trial_started_at')
    op.drop_column('organizations', 'team_size')
    op.drop_column('organizations', 'onboarding_completed')
    op.drop_column('organizations', 'appsumo_addendum_accepted_by_user_id')
    op.drop_column('organizations', 'appsumo_addendum_accepted_at')
    op.drop_column('organizations', 'appsumo_addendum_version')
    op.drop_column('organizations', 'appsumo_addendum_accepted')
    op.drop_column('organizations', 'appsumo_code')
    op.drop_column('organizations', 'plan_source')
