"""add lead indexes

Revision ID: 2a7030940b51
Revises: 85fcf7522baa
Create Date: 2025-08-15 21:27:42.972548
"""
from typing import Sequence, Union, Iterable, Set

from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "2a7030940b51"
down_revision: Union[str, Sequence[str], None] = "85fcf7522baa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Index specs
INDEX_SPECS = [
    ("ix_leads_email", ["email"]),
    ("ix_leads_phone", ["phone"]),
    ("ix_leads_status", ["status"]),
    ("ix_leads_source", ["source"]),
    ("ix_leads_created_at", ["created_at"]),
    ("ix_leads_status_created_at", ["status", "created_at"]),
    ("ix_leads_org_created_at", ["organization_id", "created_at"]),
    ("ix_leads_org_status_created_at", ["organization_id", "status", "created_at"]),
]

TABLE = "leads"


def _existing_columns(table: str) -> Set[str]:
    """Only valid in online mode."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {col["name"] for col in insp.get_columns(table)}


def _existing_indexes(table: str) -> Set[str]:
    """Only valid in online mode."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {ix["name"] for ix in insp.get_indexes(table)}


def _columns_exist(required: Iterable[str], available: Set[str]) -> bool:
    return set(required).issubset(available)


def upgrade() -> None:
    offline = context.is_offline_mode()

    if offline:
        # In offline mode, just emit CREATE INDEX statements.
        # Alembic's op.create_index works fine for SQL emission.
        for name, cols in INDEX_SPECS:
            op.create_index(name, TABLE, cols, unique=False)
    else:
        # Online: introspect to avoid errors if columns lag/lead.
        cols = _existing_columns(TABLE)
        for name, columns in INDEX_SPECS:
            if _columns_exist(columns, cols):
                op.create_index(name, TABLE, columns, unique=False)


def downgrade() -> None:
    offline = context.is_offline_mode()

    if offline:
        # Emit safe drops with IF EXISTS (PostgreSQL).
        for name, _ in INDEX_SPECS:
            op.execute(f'DROP INDEX IF EXISTS "{name}";')
    else:
        # Online: drop only if present.
        existing_idx = _existing_indexes(TABLE)
        for name, _ in INDEX_SPECS:
            if name in existing_idx:
                op.drop_index(name, table_name=TABLE)
