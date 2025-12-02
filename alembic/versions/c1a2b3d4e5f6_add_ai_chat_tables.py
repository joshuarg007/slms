"""add_ai_chat_tables

Revision ID: c1a2b3d4e5f6
Revises: a8821d26ed93
Create Date: 2025-12-01 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'a8821d26ed93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add AI chat tables and columns."""
    # Add AI usage columns to organizations
    op.add_column('organizations', sa.Column('ai_messages_this_month', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('ai_messages_month_reset', sa.DateTime(), nullable=True))

    # Create chat_conversations table
    op.create_table(
        'chat_conversations',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('context_type', sa.String(50), nullable=False, server_default='general'),
        sa.Column('context_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('chat_conversations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tokens_input', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tokens_output', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Remove AI chat tables and columns."""
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')
    op.drop_column('organizations', 'ai_messages_month_reset')
    op.drop_column('organizations', 'ai_messages_this_month')
