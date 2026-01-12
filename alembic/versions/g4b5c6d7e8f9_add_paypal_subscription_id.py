"""add paypal_subscription_id to organizations

Revision ID: g4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-01-12

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g4b5c6d7e8f9'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'organizations',
        sa.Column('paypal_subscription_id', sa.String(), nullable=True, index=True)
    )
    op.create_index(
        'ix_organizations_paypal_subscription_id',
        'organizations',
        ['paypal_subscription_id'],
        unique=False
    )


def downgrade():
    op.drop_index('ix_organizations_paypal_subscription_id', table_name='organizations')
    op.drop_column('organizations', 'paypal_subscription_id')
