"""add salesperson_daily_stats table"""

from alembic import op
import sqlalchemy as sa

# Correct Alembic identifiers based on your folder listing
revision = "0007_add_salesperson_daily_stats"
down_revision = "4c35a650e46b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "salesperson_daily_stats",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("owner_id", sa.String(100), nullable=False),
        sa.Column("owner_email", sa.String(255), nullable=True),
        sa.Column("owner_name", sa.String(255), nullable=True),
        sa.Column("stats_date", sa.Date(), nullable=False),
        sa.Column("emails_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("calls_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("meetings_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_deals_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint(
            "organization_id",
            "provider",
            "owner_id",
            "stats_date",
            name="uq_org_provider_owner_date",
        ),
    )

    op.create_index(
        "ix_salesperson_daily_stats_org_id",
        "salesperson_daily_stats",
        ["organization_id"],
    )
    op.create_index(
        "ix_salesperson_daily_stats_provider",
        "salesperson_daily_stats",
        ["provider"],
    )
    op.create_index(
        "ix_salesperson_daily_stats_owner_id",
        "salesperson_daily_stats",
        ["owner_id"],
    )
    op.create_index(
        "ix_salesperson_daily_stats_stats_date",
        "salesperson_daily_stats",
        ["stats_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_salesperson_daily_stats_stats_date", table_name="salesperson_daily_stats")
    op.drop_index("ix_salesperson_daily_stats_owner_id", table_name="salesperson_daily_stats")
    op.drop_index("ix_salesperson_daily_stats_provider", table_name="salesperson_daily_stats")
    op.drop_index("ix_salesperson_daily_stats_org_id", table_name="salesperson_daily_stats")
    op.drop_table("salesperson_daily_stats")
