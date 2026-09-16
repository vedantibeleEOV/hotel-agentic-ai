from typing import Optional

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class StaffEntity(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    assigned_floor = Column(Integer, nullable=True)
    assigned_room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    is_available = Column(Boolean, nullable=False, default=True)
    active_task_count = Column(Integer, nullable=False, default=0)

    operational_tasks = relationship("OperationalTaskEntity", back_populates="staff")
