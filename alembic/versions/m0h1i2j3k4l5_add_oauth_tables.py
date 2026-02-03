"""add OAuth 2.0 tables for Zapier integration

Revision ID: m0h1i2j3k4l5
Revises: l9g0h1i2j3k4
Create Date: 2026-02-02

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'm0h1i2j3k4l5'
down_revision = 'l9g0h1i2j3k4'
branch_labels = None
depends_on = None


def upgrade():
    # Create oauth_clients table
    op.create_table(
        'oauth_clients',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('client_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('client_secret', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('redirect_uris', sa.Text(), nullable=False),
        sa.Column('scopes', sa.Text(), nullable=False, server_default='read write'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create oauth_tokens table
    op.create_table(
        'oauth_tokens',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('oauth_clients.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('access_token', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('refresh_token', sa.String(100), unique=True, nullable=True, index=True),
        sa.Column('token_type', sa.String(20), nullable=False, server_default='Bearer'),
        sa.Column('scopes', sa.Text(), nullable=False, server_default='read write'),
        sa.Column('access_token_expires_at', sa.DateTime(), nullable=False),
        sa.Column('refresh_token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('authorization_code', sa.String(100), unique=True, nullable=True, index=True),
        sa.Column('authorization_code_expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('oauth_tokens')
    op.drop_table('oauth_clients')
