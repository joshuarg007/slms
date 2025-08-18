"""add first_name and last_name to leads (SQLite-safe)

Revision ID: 85fcf7522baa
Revises: 7e803d115780
Create Date: 2025-08-10 00:00:02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "85fcf7522baa"
down_revision: Union[str, Sequence[str], None] = "7e803d115780"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "leads"


def _existing_cols(name: str):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {c["name"] for c in insp.get_columns(name)}


def upgrade() -> None:
    existing = _existing_cols(TABLE)

    if "first_name" not in existing:
        op.add_column(TABLE, sa.Column("first_name", sa.String(), nullable=True))

    if "last_name" not in existing:
        op.add_column(TABLE, sa.Column("last_name", sa.String(), nullable=True))


def downgrade() -> None:
    existing = _existing_cols(TABLE)

    if "first_name" in existing:
        op.drop_column(TABLE, "first_name")

    if "last_name" in existing:
        op.drop_column(TABLE, "last_name")
