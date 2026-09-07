from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.database.base import Base


class OperationalTaskEntity(Base):
    __tablename__ = "operational_tasks"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    task_type = Column(String(50), nullable=False)
    priority_score = Column(Integer, nullable=False)
    priority_level = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    assigned_staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    room = relationship("RoomEntity", back_populates="operational_tasks")
    staff = relationship("StaffEntity", back_populates="operational_tasks")
