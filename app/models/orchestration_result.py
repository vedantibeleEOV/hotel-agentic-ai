from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class OrchestrationResult(BaseModel):
    event_id: UUID
    workflow_name: str
    current_agent: str
    next_agent: str
    room_id: int
    reservation_id: int
    next_reservation_id: Optional[int]
    status: str
    reason: str
