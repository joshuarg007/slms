"""add_billing_fields

Revision ID: a8821d26ed93
Revises: 37ba320f781a
Create Date: 2025-11-29 15:35:17.005838

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8821d26ed93'
down_revision: Union[str, Sequence[str], None] = '37ba320f781a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add billing-related columns to organizations."""
    op.add_column('organizations', sa.Column('billing_cycle', sa.String(), nullable=False, server_default='monthly'))
    op.add_column('organizations', sa.Column('trial_ends_at', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('leads_this_month', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('leads_month_reset', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove billing-related columns from organizations."""
    op.drop_column('organizations', 'leads_month_reset')
    op.drop_column('organizations', 'leads_this_month')
    op.drop_column('organizations', 'trial_ends_at')
    op.drop_column('organizations', 'billing_cycle')
