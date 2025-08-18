"""add organization_id to leads (SQLite-safe)

Revision ID: afe7316655d4
Revises: 4c35a650e46b
Create Date: 2025-08-18
"""
from typing import Sequence, Union, Set, Iterable
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "afe7316655d4"
down_revision: Union[str, Sequence[str], None] = "4c35a650e46b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "leads"

INDEX_SPECS = [
    ("ix_leads_organization_id", ["organization_id"]),
    ("ix_leads_org_created_at", ["organization_id", "created_at"]),
    ("ix_leads_org_status_created_at", ["organization_id", "status", "created_at"]),
]


def _cols(name: str) -> Set[str]:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {c["name"] for c in insp.get_columns(name)}


def _has_all(cols_needed: Iterable[str], cols_have: Set[str]) -> bool:
    return set(cols_needed).issubset(cols_have)


def upgrade() -> None:
    cols = _cols(TABLE)

    # 1) Add organization_id if missing
    if "organization_id" not in cols:
        op.add_column(TABLE, sa.Column("organization_id", sa.Integer(), nullable=True))
        cols.add("organization_id")

    # 2) Create indexes (only when their columns exist)
    for name, columns in INDEX_SPECS:
        if _has_all(columns, cols):
            op.create_index(name, TABLE, columns, unique=False)


def downgrade() -> None:
    # Drop indexes if present; then drop column if present.
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_idx = {ix["name"] for ix in insp.get_indexes(TABLE)}
    for name, _columns in INDEX_SPECS:
        if name in existing_idx:
            op.drop_index(name, table_name=TABLE)

    cols = _cols(TABLE)
    if "organization_id" in cols:
        op.drop_column(TABLE, "organization_id")
