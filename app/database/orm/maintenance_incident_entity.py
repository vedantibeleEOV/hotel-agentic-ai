from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, Uuid
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
    affects_room_readiness = Column(Boolean, nullable=True)
    status = Column(String(50), nullable=False, default="OPEN")
    assigned_technician_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    sla_minutes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    operational_task_id = Column(Uuid(as_uuid=True), ForeignKey("operational_tasks.id"), nullable=True)

    # Enriched AI decision details and resolution tracking
    category_reason = Column(String(500), nullable=True)
    severity_reason = Column(String(500), nullable=True)
    confidence_score = Column(String(20), nullable=True)
    decision_source = Column(String(50), nullable=True, default="RULE_TABLE")
    safety_rule_applied = Column(Boolean, nullable=True, default=False)
    safety_rule_text = Column(String(500), nullable=True)
    technician_match_reason = Column(String(500), nullable=True)
    is_fallback = Column(Boolean, nullable=True, default=False)
    needs_human_review = Column(Boolean, nullable=True, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    original_ai_decision = Column(JSON, nullable=True)
    blocks_housekeeping = Column(Boolean, nullable=True, default=True)
    housekeeping_hold_reason = Column(String(500), nullable=True)

    room = relationship("RoomEntity")
    reported_by_staff = relationship("StaffEntity", foreign_keys=[reported_by_staff_id])
    assigned_technician = relationship("StaffEntity", foreign_keys=[assigned_technician_id])
    operational_task = relationship("OperationalTaskEntity")
