"""Initial lead table

Revision ID: 7e803d115780
Revises: 9a86d1d44c25
Create Date: 2025-07-13 14:52:55.592204
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7e803d115780'
down_revision: Union[str, Sequence[str], None] = '9a86d1d44c25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop foreign key from leads to lead_sources before dropping tables
    op.drop_constraint('leads_source_id_fkey', 'leads', type_='foreignkey')
    op.drop_column('leads', 'source_id')

    # Drop legacy tables
    op.drop_table('lead_sources')
    op.drop_table('assignments')
    op.drop_table('users')

    # Add new columns to leads table
    op.add_column('leads', sa.Column('name', sa.String(), nullable=True))
    op.execute("UPDATE leads SET name = 'Unknown' WHERE name IS NULL")
    op.alter_column('leads', 'name', nullable=False)

    op.add_column('leads', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('leads', sa.Column('source', sa.String(), nullable=True))

    # Make email column not nullable
    op.alter_column('leads', 'email',
                    existing_type=sa.VARCHAR(length=150),
                    nullable=False)

    # Drop old columns from leads
    op.drop_column('leads', 'full_name')
    op.drop_column('leads', 'status')

    # Create index on ID
    op.create_index(op.f('ix_leads_id'), 'leads', ['id'], unique=False)


def downgrade() -> None:
    # Recreate dropped columns
    op.add_column('leads', sa.Column('status', sa.VARCHAR(length=50), server_default=sa.text("'new'::character varying"), nullable=True))
    op.add_column('leads', sa.Column('full_name', sa.VARCHAR(length=100), nullable=False))
    op.add_column('leads', sa.Column('source_id', sa.INTEGER(), nullable=True))

    # Recreate foreign key
    op.create_foreign_key('leads_source_id_fkey', 'leads', 'lead_sources', ['source_id'], ['id'])

    # Drop new index and columns
    op.drop_index(op.f('ix_leads_id'), table_name='leads')
    op.alter_column('leads', 'email',
                    existing_type=sa.VARCHAR(length=150),
                    nullable=True)
    op.drop_column('leads', 'source')
    op.drop_column('leads', 'notes')
    op.drop_column('leads', 'name')

    # Recreate dropped tables
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.CheckConstraint("role IN ('admin', 'sales_rep')", name='users_role_check'),
        sa.UniqueConstraint('email', name='users_email_key')
    )

    op.create_table('assignments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lead_id', sa.Integer(), sa.ForeignKey('leads.id')),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('assigned_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'))
    )

    op.create_table('lead_sources',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('source_name', sa.String(length=100), nullable=False)
    )
