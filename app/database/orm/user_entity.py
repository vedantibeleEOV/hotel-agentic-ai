from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class UserEntity(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    staff_id: Mapped[Optional[int]] = mapped_column(ForeignKey("staff.id"), nullable=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # HOUSEKEEPING, MAINTENANCE, SUPERVISOR, MANAGER
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    staff = relationship("StaffEntity", foreign_keys=[staff_id], lazy="joined")
