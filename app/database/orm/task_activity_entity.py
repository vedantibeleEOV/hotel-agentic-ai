from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.database.base import Base


class TaskActivityEntity(Base):
    __tablename__ = "task_activities"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    task_id = Column(Uuid(as_uuid=True), ForeignKey("operational_tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    event_type = Column(String(50), nullable=False)
    title = Column(String(100), nullable=False)
    actor_name = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(255), nullable=True)
    outcome = Column(String(255), nullable=True)

    task = relationship("OperationalTaskEntity", back_populates="activities")
    room = relationship("RoomEntity")
