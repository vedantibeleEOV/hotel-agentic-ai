"""add_maintenance_ai_details_and_staff_skills

Revision ID: f2a3b4c5d6e7
Revises: e1a2b3c4d5e6
Create Date: 2026-10-06 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add AI decision and resolution tracking columns to maintenance_incidents
    op.add_column('maintenance_incidents', sa.Column('category_reason', sa.String(length=500), nullable=True))
    op.add_column('maintenance_incidents', sa.Column('severity_reason', sa.String(length=500), nullable=True))
    op.add_column('maintenance_incidents', sa.Column('confidence_score', sa.String(length=20), nullable=True))
    op.add_column('maintenance_incidents', sa.Column('safety_rule_applied', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('maintenance_incidents', sa.Column('safety_rule_text', sa.String(length=500), nullable=True))
    op.add_column('maintenance_incidents', sa.Column('technician_match_reason', sa.String(length=500), nullable=True))
    op.add_column('maintenance_incidents', sa.Column('is_fallback', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('maintenance_incidents', sa.Column('needs_human_review', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('maintenance_incidents', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('maintenance_incidents', sa.Column('original_ai_decision', sa.JSON(), nullable=True))

    # 2. Add skills and rich availability columns to staff
    op.add_column('staff', sa.Column('skills', sa.JSON(), nullable=True))
    op.add_column('staff', sa.Column('availability_status', sa.String(length=30), nullable=False, server_default='AVAILABLE'))
    op.add_column('staff', sa.Column('availability_note', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('staff', 'availability_note')
    op.drop_column('staff', 'availability_status')
    op.drop_column('staff', 'skills')

    op.drop_column('maintenance_incidents', 'original_ai_decision')
    op.drop_column('maintenance_incidents', 'resolved_at')
    op.drop_column('maintenance_incidents', 'needs_human_review')
    op.drop_column('maintenance_incidents', 'is_fallback')
    op.drop_column('maintenance_incidents', 'technician_match_reason')
    op.drop_column('maintenance_incidents', 'safety_rule_text')
    op.drop_column('maintenance_incidents', 'safety_rule_applied')
    op.drop_column('maintenance_incidents', 'confidence_score')
    op.drop_column('maintenance_incidents', 'severity_reason')
    op.drop_column('maintenance_incidents', 'category_reason')
