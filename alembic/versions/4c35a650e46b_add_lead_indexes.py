"""add lead indexes

Revision ID: 4c35a650e46b
Revises: 2a7030940b51
Create Date: 2025-08-18 16:10:03.965690

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c35a650e46b'
down_revision: Union[str, Sequence[str], None] = '2a7030940b51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
