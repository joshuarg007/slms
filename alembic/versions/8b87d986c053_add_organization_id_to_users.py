"""add organization_id to users (SQLite-safe)

Revision ID: 8b87d986c053
Revises: afe7316655d4
Create Date: 2025-08-18
"""
from typing import Sequence, Union, Set
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "8b87d986c053"
down_revision: Union[str, Sequence[str], None] = "afe7316655d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "users"


def _table_names():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return set(insp.get_table_names())


def _cols(name: str) -> Set[str]:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if name not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(name)}


def upgrade() -> None:
    # Only act if the users table exists
    if TABLE not in _table_names():
        return

    cols = _cols(TABLE)
    if "organization_id" not in cols:
        op.add_column(TABLE, sa.Column("organization_id", sa.Integer(), nullable=True))

    # Add index if not already present
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_idx = {ix["name"] for ix in insp.get_indexes(TABLE)}
    if "ix_users_organization_id" not in existing_idx:
        op.create_index("ix_users_organization_id", TABLE, ["organization_id"], unique=False)


def downgrade() -> None:
    if TABLE not in _table_names():
        return
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_idx = {ix["name"] for ix in insp.get_indexes(TABLE)}
    if "ix_users_organization_id" in existing_idx:
        op.drop_index("ix_users_organization_id", table_name=TABLE)

    cols = _cols(TABLE)
    if "organization_id" in cols:
        op.drop_column(TABLE, "organization_id")
