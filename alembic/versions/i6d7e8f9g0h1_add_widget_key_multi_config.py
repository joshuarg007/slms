"""Add widget_key and allow multiple configs per org

Revision ID: i6d7e8f9g0h1
Revises: 95ee6ff2147a
Create Date: 2026-01-31 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i6d7e8f9g0h1'
down_revision: Union[str, Sequence[str], None] = '95ee6ff2147a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add widget_key column (allow NULL initially to backfill existing rows)
    op.add_column('chat_widget_configs', sa.Column('widget_key', sa.String(length=50), nullable=True))

    # Backfill existing rows with a generated widget_key based on their id
    # Using raw SQL for compatibility
    op.execute("UPDATE chat_widget_configs SET widget_key = 'widget_' || id WHERE widget_key IS NULL")

    # Now make widget_key NOT NULL
    op.alter_column('chat_widget_configs', 'widget_key', nullable=False)

    # Create unique index on widget_key
    op.create_index(op.f('ix_chat_widget_configs_widget_key'), 'chat_widget_configs', ['widget_key'], unique=True)

    # Drop the unique constraint on organization_id (allow multiple configs per org)
    op.drop_index(op.f('ix_chat_widget_configs_organization_id'), table_name='chat_widget_configs')
    op.create_index(op.f('ix_chat_widget_configs_organization_id'), 'chat_widget_configs', ['organization_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Restore unique constraint on organization_id
    op.drop_index(op.f('ix_chat_widget_configs_organization_id'), table_name='chat_widget_configs')
    op.create_index(op.f('ix_chat_widget_configs_organization_id'), 'chat_widget_configs', ['organization_id'], unique=True)

    # Drop widget_key index and column
    op.drop_index(op.f('ix_chat_widget_configs_widget_key'), table_name='chat_widget_configs')
    op.drop_column('chat_widget_configs', 'widget_key')
