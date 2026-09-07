from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class RoomReadinessResult(BaseModel):
    event_id: UUID
    room_id: int
    previous_status: str
    new_status: str
    next_reservation_id: Optional[int]
    next_guest_id: Optional[int]
    next_guest_type: Optional[str]
    early_check_in_requested: bool
    hours_until_arrival: Optional[float]
    priority_score: int
    priority_level: str
    next_agent: str
    status: str
    reason: str
