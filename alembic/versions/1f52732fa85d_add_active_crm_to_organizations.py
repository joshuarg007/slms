"""add active_crm to organizations

Revision ID: 1f52732fa85d
Revises: 62092c48127c
Create Date: 2025-09-08 17:17:29.518906
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "1f52732fa85d"
down_revision: Union[str, Sequence[str], None] = "62092c48127c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("organizations")}

    # Add column if missing. Keep server_default for SQLite (no DROP DEFAULT support).
    if "active_crm" not in cols:
        op.add_column(
            "organizations",
            sa.Column("active_crm", sa.String(length=20), nullable=False, server_default="hubspot"),
        )
    # Note: on SQLite, no attempt to drop the default. DEV ONLY


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("organizations")}
    if "active_crm" in cols:
        op.drop_column("organizations", "active_crm")
