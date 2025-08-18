"""create leads table (resilient bootstrap)

Revision ID: 9a86d1d44c25
Revises: 
Create Date: 2025-08-10 00:00:00
"""
from typing import Optional, Sequence, Union, Set
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "9a86d1d44c25"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "leads"

# Minimal base schema this migration guarantees exists.
# Later migrations (e.g., 7e803... and onward) may add more columns.
BASE_COLUMNS = {
    "id": sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    "email": sa.Column("email", sa.String, nullable=False),
    "name": sa.Column("name", sa.String, nullable=False),
    "notes": sa.Column("notes", sa.Text, nullable=True),
    "source": sa.Column("source", sa.String, nullable=True),
    # optional fields that later migrations/indexes may reference;
    # if they already exist we won't touch them; if not,
    # they can be added by their dedicated migrations.
    "phone": sa.Column("phone", sa.String, nullable=True),
    "status": sa.Column("status", sa.String, nullable=True),
    "created_at": sa.Column(
        "created_at",
        sa.DateTime(timezone=False),
        server_default=sa.func.now(),
        nullable=True,
    ),
}


def _inspector():
    bind = op.get_bind()
    return sa.inspect(bind)


def _table_exists(name: str) -> bool:
    insp = _inspector()
    return name in insp.get_table_names()


def _existing_cols(name: str) -> Set[str]:
    insp = _inspector()
    return {c["name"] for c in insp.get_columns(name)}


def upgrade() -> None:
    if not _table_exists(TABLE):
        # Fresh database: create the table with our base shape.
        op.create_table(*([TABLE] + list(BASE_COLUMNS.values())))
        # helpful index on id for older code that expected it
        op.create_index("ix_leads_id", TABLE, ["id"], unique=False)
        return

    # Table already exists: only add missing columns (avoid duplicates).
    existing = _existing_cols(TABLE)

    def add_if_missing(col_name: str):
        if col_name not in existing:
            op.add_column(TABLE, BASE_COLUMNS[col_name])

    for cname in ("name", "notes", "source", "email"):
        add_if_missing(cname)

    # keep older behavior that expected an index on id
    # (safe: SQLite ignores duplicate create index if name already taken on same table)
    try:
        op.create_index("ix_leads_id", TABLE, ["id"], unique=False)
    except Exception:
        # if it exists already on some engines, ignore
        pass


def downgrade() -> None:
    # Safe-ish downgrade: drop index if present and drop table if present.
    # (SQLite has limited ALTER TABLE; this keeps it simple.)
    if _table_exists(TABLE):
        try:
            op.drop_index("ix_leads_id", table_name=TABLE)
        except Exception:
            pass
        op.drop_table(TABLE)
