from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(10), unique=True, nullable=False)
    floor = Column(Integer, nullable=False)
    room_type = Column(String(50), default="Standard")
    status = Column(String(50), default="vacant_dirty")
    is_ready_for_checkin = Column(Boolean, default=False)
    priority_score = Column(Float, default=0.0)

    tasks = relationship("HousekeepingTask", back_populates="room")
    incidents = relationship("MaintenanceIncident", back_populates="room")
    reservations = relationship("Reservation", back_populates="assigned_room")

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    guest_name = Column(String(100), nullable=False)
    is_vip = Column(Boolean, default=False)
    early_checkin_requested = Column(Boolean, default=False)
    arrival_time = Column(DateTime, nullable=False)
    departure_time = Column(DateTime, nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)

    assigned_room = relationship("Room", back_populates="reservations")

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    current_workload = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)

class HousekeepingTask(Base):
    __tablename__ = "housekeeping_tasks"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    task_type = Column(String(50), default="standard_clean")
    priority = Column(Integer, default=1)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="tasks")

class MaintenanceIncident(Base):
    __tablename__ = "maintenance_incidents"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    technician_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    category = Column(String(50), nullable=False)
    severity = Column(Integer, default=1)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open")
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="incidents")
