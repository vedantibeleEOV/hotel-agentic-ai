from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class RoomReadinessResult(BaseModel):
    event_id: UUID
    room_id: int
    previous_status: str
    new_status: str
    next_reservation_id: Optional[int] = None
    next_guest_id: Optional[int] = None
    next_guest_type: Optional[str] = None
    early_check_in_requested: bool = False
    hours_until_arrival: Optional[float] = None
    priority_score: int = 0
    priority_level: str = "NORMAL"
    next_agent: Optional[str] = None
    status: str
    reason: str
