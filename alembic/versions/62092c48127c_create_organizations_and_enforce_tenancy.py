"""create organizations and enforce tenancy (SQLite-safe)

Revision ID: 62092c48127c
Revises: 8b87d986c053
Create Date: 2025-08-18
"""
from __future__ import annotations

from typing import Sequence, Union, Set
from uuid import uuid4

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "62092c48127c"
down_revision: Union[str, Sequence[str], None] = "8b87d986c053"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ORG_TABLE = "organizations"
USERS = "users"
LEADS = "leads"


def _insp():
    bind = op.get_bind()
    return sa.inspect(bind)


def _tables() -> Set[str]:
    return set(_insp().get_table_names())


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1) Create organizations table (id, name, domain UNIQUE, api_key UNIQUE, created_at)
    if ORG_TABLE not in _tables():
        op.create_table(
            ORG_TABLE,
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("name", sa.String, nullable=True),
            sa.Column("domain", sa.String, nullable=False, unique=True),
            sa.Column("api_key", sa.String, nullable=True, unique=True),
            sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        )
        # Helpful secondary indexes (SQLite will back these with the UNIQUE constraints as well)
        op.create_index("ix_org_domain", ORG_TABLE, ["domain"], unique=True)
        op.create_index("ix_org_api_key", ORG_TABLE, ["api_key"], unique=True)

    # 2) Seed organizations from distinct email domains found in users and leads
    #    (only where an '@' exists; domains normalized to lower-case)
    #    Use INSERT OR IGNORE so we don't duplicate.
    domains_sql = """
        SELECT DISTINCT LOWER(substr(email, instr(email, '@') + 1)) AS domain
        FROM {table}
        WHERE email IS NOT NULL AND instr(email, '@') > 0
    """
    user_domains = [r[0] for r in bind.execute(sa.text(domains_sql.format(table=USERS))).fetchall()]
    lead_domains = [r[0] for r in bind.execute(sa.text(domains_sql.format(table=LEADS))).fetchall()]
    all_domains = sorted({*(user_domains or []), *(lead_domains or [])})

    for d in all_domains:
        if not d:
            continue
        bind.execute(
            sa.text(
                "INSERT OR IGNORE INTO organizations (name, domain, api_key, created_at) "
                "VALUES (:name, :domain, :api_key, CURRENT_TIMESTAMP)"
            ),
            {"name": d, "domain": d, "api_key": uuid4().hex},
        )

    # 3) Backfill users.organization_id and leads.organization_id from organizations.domain
    #    (We assume columns exist from prior migrations; if not, add them nullable first.)
    user_cols = {c["name"] for c in insp.get_columns(USERS)} if USERS in _tables() else set()
    lead_cols = {c["name"] for c in insp.get_columns(LEADS)} if LEADS in _tables() else set()

    if USERS in _tables() and "organization_id" not in user_cols:
        op.add_column(USERS, sa.Column("organization_id", sa.Integer(), nullable=True))
        user_cols.add("organization_id")

    if LEADS in _tables() and "organization_id" not in lead_cols:
        op.add_column(LEADS, sa.Column("organization_id", sa.Integer(), nullable=True))
        lead_cols.add("organization_id")

    # Update users
    if USERS in _tables() and "organization_id" in user_cols:
        bind.execute(
            sa.text(
                """
                UPDATE users
                SET organization_id = (
                    SELECT o.id
                    FROM organizations o
                    WHERE LOWER(substr(users.email, instr(users.email,'@') + 1)) = o.domain
                )
                WHERE organization_id IS NULL
                  AND email IS NOT NULL
                  AND instr(email,'@') > 0
                """
            )
        )
        # Ensure no NULLs remain; if any, stop the migration for correctness.
        remaining = bind.execute(sa.text("SELECT COUNT(*) FROM users WHERE organization_id IS NULL")).scalar()
        if remaining and remaining > 0:
            raise RuntimeError(
                f"Cannot enforce NOT NULL: {remaining} user(s) missing organization_id. "
                f"Ensure all user emails have a valid domain that maps to organizations.domain."
            )

    # Update leads
    if LEADS in _tables() and "organization_id" in lead_cols:
        bind.execute(
            sa.text(
                """
                UPDATE leads
                SET organization_id = (
                    SELECT o.id
                    FROM organizations o
                    WHERE LOWER(substr(leads.email, instr(leads.email,'@') + 1)) = o.domain
                )
                WHERE organization_id IS NULL
                  AND email IS NOT NULL
                  AND instr(email,'@') > 0
                """
            )
        )
        remaining = bind.execute(sa.text("SELECT COUNT(*) FROM leads WHERE organization_id IS NULL")).scalar()
        if remaining and remaining > 0:
            raise RuntimeError(
                f"Cannot enforce NOT NULL: {remaining} lead(s) missing organization_id. "
                f"Ensure all lead emails have a valid domain that maps to organizations.domain."
            )

    # 4) Enforce NOT NULL + Foreign Keys (SQLite requires batch recreate)
    if USERS in _tables() and "organization_id" in user_cols:
        with op.batch_alter_table(USERS, recreate="always") as batch:
            batch.alter_column("organization_id", existing_type=sa.Integer(), nullable=False)
            # FK to organizations
            batch.create_foreign_key(
                "fk_users_organization_id",
                ORG_TABLE,
                ["organization_id"],
                ["id"],
                ondelete="RESTRICT",
            )

    if LEADS in _tables() and "organization_id" in lead_cols:
        with op.batch_alter_table(LEADS, recreate="always") as batch:
            batch.alter_column("organization_id", existing_type=sa.Integer(), nullable=False)
            # FK to organizations
            batch.create_foreign_key(
                "fk_leads_organization_id",
                ORG_TABLE,
                ["organization_id"],
                ["id"],
                ondelete="RESTRICT",
            )


def downgrade() -> None:
    # Relax constraints: drop FKs and make columns nullable again; then drop organizations.
    if USERS in _tables():
        with op.batch_alter_table(USERS, recreate="always") as batch:
            try:
                batch.drop_constraint("fk_users_organization_id", type_="foreignkey")
            except Exception:
                pass
            batch.alter_column("organization_id", existing_type=sa.Integer(), nullable=True)

    if LEADS in _tables():
        with op.batch_alter_table(LEADS, recreate="always") as batch:
            try:
                batch.drop_constraint("fk_leads_organization_id", type_="foreignkey")
            except Exception:
                pass
            batch.alter_column("organization_id", existing_type=sa.Integer(), nullable=True)

    if ORG_TABLE in _tables():
        try:
            op.drop_index("ix_org_domain", table_name=ORG_TABLE)
        except Exception:
            pass
        try:
            op.drop_index("ix_org_api_key", table_name=ORG_TABLE)
        except Exception:
            pass
        op.drop_table(ORG_TABLE)
