"""Add chat widget pro fields - goal, persistence, collection options

Revision ID: k8f9g0h1i2j3
Revises: j7e8f9g0h1i2
Create Date: 2026-02-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k8f9g0h1i2j3'
down_revision: Union[str, Sequence[str], None] = 'j7e8f9g0h1i2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add pro configuration fields to chat_widget_configs."""
    # Goal and behavior settings
    op.add_column('chat_widget_configs', sa.Column('primary_goal', sa.String(length=30), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('goal_url', sa.String(length=2048), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('rebuttal_count', sa.Integer(), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('persistence_level', sa.String(length=20), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('welcome_message', sa.String(length=500), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('success_message', sa.Text(), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('collect_phone', sa.Boolean(), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('collect_name', sa.Boolean(), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('collect_company', sa.Boolean(), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('quick_replies', sa.Text(), nullable=True))

    # Advanced appearance
    op.add_column('chat_widget_configs', sa.Column('header_title', sa.String(length=100), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('header_subtitle', sa.String(length=100), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('chat_bg_color', sa.String(length=7), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('user_bubble_color', sa.String(length=7), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('bot_bubble_color', sa.String(length=7), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('button_size', sa.String(length=10), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('show_branding', sa.Boolean(), nullable=True))

    # Set defaults for existing rows
    op.execute("UPDATE chat_widget_configs SET primary_goal = 'capture_email' WHERE primary_goal IS NULL")
    op.execute("UPDATE chat_widget_configs SET rebuttal_count = 5 WHERE rebuttal_count IS NULL")
    op.execute("UPDATE chat_widget_configs SET persistence_level = 'medium' WHERE persistence_level IS NULL")
    op.execute("UPDATE chat_widget_configs SET collect_phone = FALSE WHERE collect_phone IS NULL")
    op.execute("UPDATE chat_widget_configs SET collect_name = TRUE WHERE collect_name IS NULL")
    op.execute("UPDATE chat_widget_configs SET collect_company = FALSE WHERE collect_company IS NULL")
    op.execute("UPDATE chat_widget_configs SET button_size = 'medium' WHERE button_size IS NULL")
    op.execute("UPDATE chat_widget_configs SET show_branding = TRUE WHERE show_branding IS NULL")

    # Make required columns NOT NULL
    op.alter_column('chat_widget_configs', 'primary_goal', nullable=False)
    op.alter_column('chat_widget_configs', 'rebuttal_count', nullable=False)
    op.alter_column('chat_widget_configs', 'persistence_level', nullable=False)
    op.alter_column('chat_widget_configs', 'collect_phone', nullable=False)
    op.alter_column('chat_widget_configs', 'collect_name', nullable=False)
    op.alter_column('chat_widget_configs', 'collect_company', nullable=False)
    op.alter_column('chat_widget_configs', 'button_size', nullable=False)
    op.alter_column('chat_widget_configs', 'show_branding', nullable=False)


def downgrade() -> None:
    """Remove pro configuration fields from chat_widget_configs."""
    # Advanced appearance
    op.drop_column('chat_widget_configs', 'show_branding')
    op.drop_column('chat_widget_configs', 'button_size')
    op.drop_column('chat_widget_configs', 'bot_bubble_color')
    op.drop_column('chat_widget_configs', 'user_bubble_color')
    op.drop_column('chat_widget_configs', 'chat_bg_color')
    op.drop_column('chat_widget_configs', 'header_subtitle')
    op.drop_column('chat_widget_configs', 'header_title')

    # Goal and behavior
    op.drop_column('chat_widget_configs', 'quick_replies')
    op.drop_column('chat_widget_configs', 'collect_company')
    op.drop_column('chat_widget_configs', 'collect_name')
    op.drop_column('chat_widget_configs', 'collect_phone')
    op.drop_column('chat_widget_configs', 'success_message')
    op.drop_column('chat_widget_configs', 'welcome_message')
    op.drop_column('chat_widget_configs', 'persistence_level')
    op.drop_column('chat_widget_configs', 'rebuttal_count')
    op.drop_column('chat_widget_configs', 'goal_url')
    op.drop_column('chat_widget_configs', 'primary_goal')
