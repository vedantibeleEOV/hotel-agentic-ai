from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class TaskActivity(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    task_id: Optional[UUID] = None
    room_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: str
    title: str
    actor_name: str
    actor_role: str
    action: Optional[str] = None
    outcome: Optional[str] = None
