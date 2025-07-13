"""create leads table

Revision ID: 9a86d1d44c25
Revises: 
Create Date: 2025-07-01 14:06:33.429424
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9a86d1d44c25'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Only modify leads table, don't drop dependent tables
    op.add_column('leads', sa.Column('name', sa.String(), nullable=False))
    op.add_column('leads', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('leads', sa.Column('source', sa.String(), nullable=True))
    op.alter_column('leads', 'email',
               existing_type=sa.VARCHAR(length=150),
               nullable=False)
    op.create_index(op.f('ix_leads_id'), 'leads', ['id'], unique=False)
    op.drop_column('leads', 'full_name')
    op.drop_column('leads', 'source_id')
    op.drop_column('leads', 'status')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('leads', sa.Column('status', sa.VARCHAR(length=50), server_default=sa.text("'new'::character varying"), nullable=True))
    op.add_column('leads', sa.Column('source_id', sa.INTEGER(), nullable=True))
    op.add_column('leads', sa.Column('full_name', sa.VARCHAR(length=100), nullable=False))
    op.drop_index(op.f('ix_leads_id'), table_name='leads')
    op.alter_column('leads', 'email',
               existing_type=sa.VARCHAR(length=150),
               nullable=True)
    op.drop_column('leads', 'source')
    op.drop_column('leads', 'notes')
    op.drop_column('leads', 'name')
