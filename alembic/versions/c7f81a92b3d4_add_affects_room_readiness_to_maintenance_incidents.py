"""add affects_room_readiness to maintenance_incidents table

Revision ID: c7f81a92b3d4
Revises: db4ed1fe9b8d
Create Date: 2026-09-25 13:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7f81a92b3d4'
down_revision: Union[str, Sequence[str], None] = 'db4ed1fe9b8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable affects_room_readiness column to maintenance_incidents."""
    op.add_column(
        'maintenance_incidents',
        sa.Column('affects_room_readiness', sa.Boolean(), nullable=True),
    )


def downgrade() -> None:
    """Remove affects_room_readiness column from maintenance_incidents."""
    op.drop_column('maintenance_incidents', 'affects_room_readiness')
