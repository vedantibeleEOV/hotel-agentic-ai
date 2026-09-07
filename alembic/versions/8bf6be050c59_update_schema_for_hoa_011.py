"""update_schema_for_hoa_011

Revision ID: 8bf6be050c59
Revises: 
Create Date: 2026-09-03 17:37:32.563472

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8bf6be050c59'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create guests table
    op.create_table(
        'guests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=50), nullable=False),
        sa.Column('last_name', sa.String(length=50), nullable=False),
        sa.Column('guest_type', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guests_id'), 'guests', ['id'], unique=False)

    # 2. Create operational_tasks table
    op.create_table(
        'operational_tasks',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('task_type', sa.String(length=50), nullable=False),
        sa.Column('priority_score', sa.Integer(), nullable=False),
        sa.Column('priority_level', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('assigned_staff_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_staff_id'], ['staff.id'], name='fk_operational_tasks_staff_id'),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], name='fk_operational_tasks_room_id'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. Update reservations table
    op.add_column('reservations', sa.Column('guest_id', sa.Integer(), nullable=False))
    op.add_column('reservations', sa.Column('check_in_time', sa.DateTime(timezone=True), nullable=False))
    op.add_column('reservations', sa.Column('check_out_time', sa.DateTime(timezone=True), nullable=False))
    op.add_column('reservations', sa.Column('early_check_in_requested', sa.Boolean(), server_default='false', nullable=False))
    op.alter_column('reservations', 'room_id', existing_type=sa.INTEGER(), nullable=False)
    op.create_foreign_key('fk_reservations_guest_id', 'reservations', 'guests', ['guest_id'], ['id'])
    
    # Drop legacy reservations columns
    op.drop_column('reservations', 'early_checkin_requested')
    op.drop_column('reservations', 'is_vip')
    op.drop_column('reservations', 'guest_name')
    op.drop_column('reservations', 'departure_time')
    op.drop_column('reservations', 'arrival_time')

    # 4. Update rooms table
    op.add_column('rooms', sa.Column('property_id', sa.Integer(), nullable=False))
    # Drop legacy constraint and columns
    op.drop_constraint('rooms_room_number_key', 'rooms', type_='unique')
    op.drop_column('rooms', 'is_ready_for_checkin')
    op.drop_column('rooms', 'priority_score')

    # 5. Update staff table
    op.add_column('staff', sa.Column('assigned_floor', sa.Integer(), nullable=True))
    op.add_column('staff', sa.Column('active_task_count', sa.Integer(), server_default='0', nullable=False))
    op.alter_column('staff', 'is_available', existing_type=sa.BOOLEAN(), server_default='true', nullable=False)
    op.drop_column('staff', 'current_workload')


def downgrade() -> None:
    op.add_column('staff', sa.Column('current_workload', sa.INTEGER(), autoincrement=False, nullable=True))
    op.alter_column('staff', 'is_available', existing_type=sa.BOOLEAN(), nullable=True)
    op.drop_column('staff', 'active_task_count')
    op.drop_column('staff', 'assigned_floor')
    
    op.add_column('rooms', sa.Column('priority_score', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True))
    op.add_column('rooms', sa.Column('is_ready_for_checkin', sa.BOOLEAN(), autoincrement=False, nullable=True))
    op.create_unique_constraint('rooms_room_number_key', 'rooms', ['room_number'])
    op.drop_column('rooms', 'property_id')
    
    op.add_column('reservations', sa.Column('arrival_time', postgresql.TIMESTAMP(), autoincrement=False, nullable=False))
    op.add_column('reservations', sa.Column('departure_time', postgresql.TIMESTAMP(), autoincrement=False, nullable=False))
    op.add_column('reservations', sa.Column('guest_name', sa.VARCHAR(length=100), autoincrement=False, nullable=False))
    op.add_column('reservations', sa.Column('is_vip', sa.BOOLEAN(), autoincrement=False, nullable=True))
    op.add_column('reservations', sa.Column('early_checkin_requested', sa.BOOLEAN(), autoincrement=False, nullable=True))
    op.drop_constraint('fk_reservations_guest_id', 'reservations', type_='foreignkey')
    op.alter_column('reservations', 'room_id', existing_type=sa.INTEGER(), nullable=True)
    op.drop_column('reservations', 'early_check_in_requested')
    op.drop_column('reservations', 'check_out_time')
    op.drop_column('reservations', 'check_in_time')
    op.drop_column('reservations', 'guest_id')
    
    op.drop_table('operational_tasks')
    op.drop_index(op.f('ix_guests_id'), table_name='guests')
    op.drop_table('guests')
