"""merge_heads

Revision ID: 32173e2853a0
Revises: 0007_add_salesperson_daily_stats, add_billing_cols_orgs
Create Date: 2025-11-28 17:30:41.729063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '32173e2853a0'
down_revision: Union[str, Sequence[str], None] = ('0007_add_salesperson_daily_stats', 'add_billing_cols_orgs')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
