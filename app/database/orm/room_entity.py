from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database.base import Base


class RoomEntity(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, nullable=False)
    room_number = Column(String(10), nullable=False)
    floor = Column(Integer, nullable=False)
    room_type = Column(String(50), nullable=True)
    status = Column(String(50), nullable=True)

    reservations = relationship("ReservationEntity", back_populates="room")
    operational_tasks = relationship("OperationalTaskEntity", back_populates="room")
