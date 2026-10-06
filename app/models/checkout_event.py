import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.enums import EventType


class CheckoutEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    event_type: EventType = EventType.GUEST_CHECKED_OUT
    property_id: int = Field(default=1, gt=0)
    room_id: int = Field(..., gt=0)
    reservation_id: int = Field(..., gt=0)
    checkout_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

