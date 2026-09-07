from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database.base import Base


class ReservationEntity(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    check_in_time = Column(DateTime(timezone=True), nullable=False)
    check_out_time = Column(DateTime(timezone=True), nullable=False)
    early_check_in_requested = Column(Boolean, nullable=False, default=False)

    guest = relationship("GuestEntity", back_populates="reservations")
    room = relationship("RoomEntity", back_populates="reservations")
