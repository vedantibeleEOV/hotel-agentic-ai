from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import RoomStatus, TaskStatus


class HousekeepingResult(BaseModel):
    event_id: UUID
    room_id: int
    task_id: Optional[UUID] = None
    task_status: Optional[TaskStatus] = None
    assigned_staff_id: Optional[int] = None
    assigned_staff_name: Optional[str] = None
    previous_room_status: RoomStatus
    new_room_status: RoomStatus
    priority_score: int
    priority_level: str
    status: str
    reason: str
