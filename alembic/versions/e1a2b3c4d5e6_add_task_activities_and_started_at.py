"""add_task_activities_and_started_at

Revision ID: e1a2b3c4d5e6
Revises: 8bf6be050c59
Create Date: 2026-10-06 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '8bf6be050c59'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add started_at column to operational_tasks
    op.add_column('operational_tasks', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))

    # 2. Create task_activities table
    op.create_table(
        'task_activities',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('task_id', sa.Uuid(), nullable=True),
        sa.Column('room_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('actor_name', sa.String(length=100), nullable=False),
        sa.Column('actor_role', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=255), nullable=True),
        sa.Column('outcome', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['operational_tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_activities_task_id'), 'task_activities', ['task_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_task_activities_task_id'), table_name='task_activities')
    op.drop_table('task_activities')
    op.drop_column('operational_tasks', 'started_at')
