"""Add bubble icon to chat widgets and multi-form support

Revision ID: j7e8f9g0h1i2
Revises: i6d7e8f9g0h1
Create Date: 2026-02-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j7e8f9g0h1i2'
down_revision: Union[str, Sequence[str], None] = 'i6d7e8f9g0h1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add bubble_icon to chat_widget_configs
    op.add_column('chat_widget_configs', sa.Column('bubble_icon', sa.String(length=20), nullable=True))
    op.execute("UPDATE chat_widget_configs SET bubble_icon = 'chat' WHERE bubble_icon IS NULL")
    op.alter_column('chat_widget_configs', 'bubble_icon', nullable=False)

    # Add form_key and name to form_configs
    op.add_column('form_configs', sa.Column('form_key', sa.String(length=50), nullable=True))
    op.add_column('form_configs', sa.Column('name', sa.String(length=255), nullable=True))

    # Backfill existing forms with generated keys and default name
    op.execute("UPDATE form_configs SET form_key = 'form_' || id WHERE form_key IS NULL")
    op.execute("UPDATE form_configs SET name = 'Default Form' WHERE name IS NULL")

    # Make name NOT NULL
    op.alter_column('form_configs', 'name', nullable=False)

    # Create unique index on form_key
    op.create_index(op.f('ix_form_configs_form_key'), 'form_configs', ['form_key'], unique=True)

    # Drop the unique constraint on organization_id for form_configs
    op.drop_index(op.f('ix_form_configs_organization_id'), table_name='form_configs')
    op.create_index(op.f('ix_form_configs_organization_id'), 'form_configs', ['organization_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Restore unique constraint on organization_id
    op.drop_index(op.f('ix_form_configs_organization_id'), table_name='form_configs')
    op.create_index(op.f('ix_form_configs_organization_id'), 'form_configs', ['organization_id'], unique=True)

    # Drop form_key index and columns
    op.drop_index(op.f('ix_form_configs_form_key'), table_name='form_configs')
    op.drop_column('form_configs', 'name')
    op.drop_column('form_configs', 'form_key')

    # Drop bubble_icon from chat_widget_configs
    op.drop_column('chat_widget_configs', 'bubble_icon')
