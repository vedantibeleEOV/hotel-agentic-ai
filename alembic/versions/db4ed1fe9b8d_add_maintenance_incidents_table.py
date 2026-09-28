"""add maintenance_incidents table

Revision ID: db4ed1fe9b8d
Revises: b6beee759d83
Create Date: 2026-09-22 18:16:25.950745

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'db4ed1fe9b8d'
down_revision: Union[str, Sequence[str], None] = 'b6beee759d83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop legacy table if present
    op.execute("DROP TABLE IF EXISTS maintenance_incidents CASCADE;")

    op.create_table(
        'maintenance_incidents',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('reported_by_staff_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('assigned_technician_id', sa.Integer(), nullable=True),
        sa.Column('sla_minutes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('operational_task_id', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_technician_id'], ['staff.id'], name=op.f('maintenance_incidents_assigned_technician_id_fkey')),
        sa.ForeignKeyConstraint(['operational_task_id'], ['operational_tasks.id'], name=op.f('maintenance_incidents_operational_task_id_fkey')),
        sa.ForeignKeyConstraint(['reported_by_staff_id'], ['staff.id'], name=op.f('maintenance_incidents_reported_by_staff_id_fkey')),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], name=op.f('maintenance_incidents_room_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('maintenance_incidents_pkey'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('maintenance_incidents')
