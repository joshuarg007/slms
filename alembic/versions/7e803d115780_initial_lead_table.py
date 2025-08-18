"""Initial lead table (SQLite-safe pass-through)

Revision ID: 7e803d115780
Revises: 9a86d1d44c25
Create Date: 2025-08-10 00:00:01
"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "7e803d115780"
down_revision: Union[str, Sequence[str], None] = "9a86d1d44c25"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite cannot ALTER/DROP constraints, and our bootstrap migration
    # already created a compatible `leads` table. Just skip on SQLite.
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        return

    # If you ever run this migration on Postgres/MySQL, keep the legacy ops here:
    # (kept minimal; adjust to your original intent if needed)
    try:
        op.drop_constraint("leads_source_id_fkey", "leads", type_="foreignkey")
    except Exception:
        pass
    with op.batch_alter_table("leads") as batch:
        # Drop legacy columns if they exist
        try:
            batch.drop_column("source_id")
        except Exception:
            pass
        try:
            batch.drop_column("full_name")
        except Exception:
            pass
        try:
            batch.drop_column("status")
        except Exception:
            pass
        # Ensure required columns exist
        try:
            batch.add_column(sa.Column("name", sa.String(), nullable=False))
        except Exception:
            pass
        try:
            batch.add_column(sa.Column("notes", sa.Text(), nullable=True))
        except Exception:
            pass
        try:
            batch.add_column(sa.Column("source", sa.String(), nullable=True))
        except Exception:
            pass
        try:
            batch.alter_column("email", existing_type=sa.String(), nullable=False)
        except Exception:
            pass
    try:
        op.create_index("ix_leads_id", "leads", ["id"], unique=False)
    except Exception:
        pass


def downgrade() -> None:
    # No-op for SQLite; on other engines you could restore old columns if needed.
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        return
    try:
        op.drop_index("ix_leads_id", table_name="leads")
    except Exception:
        pass
