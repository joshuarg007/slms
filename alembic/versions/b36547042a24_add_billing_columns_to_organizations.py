"""add billing columns to organizations (sqlite-safe)"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, update these to match the generated filename if needed
revision: str = "add_billing_cols_orgs"
down_revision: Union[str, Sequence[str], None] = "1f52732fa85d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns(table)}
    return name in cols


def upgrade() -> None:
    # Add columns only if they don't already exist (SQLite-safe)
    if not _has_column("organizations", "stripe_customer_id"):
        op.add_column("organizations", sa.Column("stripe_customer_id", sa.String(), nullable=True))
    if not _has_column("organizations", "stripe_subscription_id"):
        op.add_column("organizations", sa.Column("stripe_subscription_id", sa.String(), nullable=True))
    if not _has_column("organizations", "plan"):
        op.add_column(
            "organizations",
            sa.Column("plan", sa.String(), nullable=False, server_default="free"),
        )
    if not _has_column("organizations", "subscription_status"):
        op.add_column(
            "organizations",
            sa.Column("subscription_status", sa.String(), nullable=False, server_default="inactive"),
        )
    if not _has_column("organizations", "current_period_end"):
        op.add_column("organizations", sa.Column("current_period_end", sa.DateTime(), nullable=True))
    # (optional) leave server_default as-is on SQLite; dropping defaults is not supported cleanly


def downgrade() -> None:
    # Drop only if exists
    if _has_column("organizations", "current_period_end"):
        op.drop_column("organizations", "current_period_end")
    if _has_column("organizations", "subscription_status"):
        op.drop_column("organizations", "subscription_status")
    if _has_column("organizations", "plan"):
        op.drop_column("organizations", "plan")
    if _has_column("organizations", "stripe_subscription_id"):
        op.drop_column("organizations", "stripe_subscription_id")
    if _has_column("organizations", "stripe_customer_id"):
        op.drop_column("organizations", "stripe_customer_id")
