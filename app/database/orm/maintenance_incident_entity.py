from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.database.base import Base


class MaintenanceIncidentEntity(Base):
    __tablename__ = "maintenance_incidents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    reported_by_staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="OPEN")
    assigned_technician_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    sla_minutes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    operational_task_id = Column(Uuid(as_uuid=True), ForeignKey("operational_tasks.id"), nullable=True)

    room = relationship("RoomEntity")
    reported_by_staff = relationship("StaffEntity", foreign_keys=[reported_by_staff_id])
    assigned_technician = relationship("StaffEntity", foreign_keys=[assigned_technician_id])
    operational_task = relationship("OperationalTaskEntity")
