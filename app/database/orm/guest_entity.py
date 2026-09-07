from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database.base import Base


class GuestEntity(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    guest_type = Column(String(50), nullable=False)

    reservations = relationship("ReservationEntity", back_populates="guest")
