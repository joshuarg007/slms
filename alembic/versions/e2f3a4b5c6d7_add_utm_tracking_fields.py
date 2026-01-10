"""add utm tracking fields to leads

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e2f3a4b5c6d7'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade():
    # UTM tracking fields
    op.add_column('leads', sa.Column('utm_source', sa.String(100), nullable=True))
    op.add_column('leads', sa.Column('utm_medium', sa.String(100), nullable=True))
    op.add_column('leads', sa.Column('utm_campaign', sa.String(255), nullable=True))
    op.add_column('leads', sa.Column('utm_term', sa.String(255), nullable=True))
    op.add_column('leads', sa.Column('utm_content', sa.String(255), nullable=True))
    op.add_column('leads', sa.Column('referrer_url', sa.String(2048), nullable=True))
    op.add_column('leads', sa.Column('landing_page_url', sa.String(2048), nullable=True))
    
    # Add indexes for common filter/group by fields
    op.create_index('ix_leads_utm_source', 'leads', ['utm_source'])
    op.create_index('ix_leads_utm_medium', 'leads', ['utm_medium'])


def downgrade():
    op.drop_index('ix_leads_utm_medium', 'leads')
    op.drop_index('ix_leads_utm_source', 'leads')
    op.drop_column('leads', 'landing_page_url')
    op.drop_column('leads', 'referrer_url')
    op.drop_column('leads', 'utm_content')
    op.drop_column('leads', 'utm_term')
    op.drop_column('leads', 'utm_campaign')
    op.drop_column('leads', 'utm_medium')
    op.drop_column('leads', 'utm_source')
