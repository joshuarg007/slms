"""add_form_configs_table

Revision ID: 37ba320f781a
Revises: 32173e2853a0
Create Date: 2025-11-28 18:11:14.062094

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37ba320f781a'
down_revision: Union[str, Sequence[str], None] = '32173e2853a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create form_configs table."""
    op.create_table(
        'form_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('form_style', sa.String(length=20), nullable=False, server_default='inline'),
        sa.Column('config_json', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id'),
    )
    op.create_index(op.f('ix_form_configs_id'), 'form_configs', ['id'], unique=False)
    op.create_index(op.f('ix_form_configs_organization_id'), 'form_configs', ['organization_id'], unique=True)


def downgrade() -> None:
    """Drop form_configs table."""
    op.drop_index(op.f('ix_form_configs_organization_id'), table_name='form_configs')
    op.drop_index(op.f('ix_form_configs_id'), table_name='form_configs')
    op.drop_table('form_configs')
