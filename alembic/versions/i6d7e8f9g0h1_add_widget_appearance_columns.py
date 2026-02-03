"""add widget appearance columns

Revision ID: i6d7e8f9g0h1
Revises: h5c6d7e8f9g0
Create Date: 2026-02-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'i6d7e8f9g0h1'
down_revision = 'h5c6d7e8f9g0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('chat_widget_configs', sa.Column('button_shape', sa.String(20), nullable=False, server_default='bubble'))
    op.add_column('chat_widget_configs', sa.Column('gradient_type', sa.String(20), nullable=False, server_default='none'))
    op.add_column('chat_widget_configs', sa.Column('gradient_color_1', sa.String(7), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('gradient_color_2', sa.String(7), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('gradient_color_3', sa.String(7), nullable=True))
    op.add_column('chat_widget_configs', sa.Column('gradient_angle', sa.Integer(), nullable=False, server_default='135'))
    op.add_column('chat_widget_configs', sa.Column('button_opacity', sa.Float(), nullable=False, server_default='1.0'))
    op.add_column('chat_widget_configs', sa.Column('blur_background', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chat_widget_configs', sa.Column('attention_effect', sa.String(20), nullable=False, server_default='none'))
    op.add_column('chat_widget_configs', sa.Column('shadow_style', sa.String(20), nullable=False, server_default='elevated'))
    op.add_column('chat_widget_configs', sa.Column('entry_animation', sa.String(20), nullable=False, server_default='scale'))


def downgrade():
    op.drop_column('chat_widget_configs', 'entry_animation')
    op.drop_column('chat_widget_configs', 'shadow_style')
    op.drop_column('chat_widget_configs', 'attention_effect')
    op.drop_column('chat_widget_configs', 'blur_background')
    op.drop_column('chat_widget_configs', 'button_opacity')
    op.drop_column('chat_widget_configs', 'gradient_angle')
    op.drop_column('chat_widget_configs', 'gradient_color_3')
    op.drop_column('chat_widget_configs', 'gradient_color_2')
    op.drop_column('chat_widget_configs', 'gradient_color_1')
    op.drop_column('chat_widget_configs', 'gradient_type')
    op.drop_column('chat_widget_configs', 'button_shape')
