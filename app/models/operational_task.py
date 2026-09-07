from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.enums import TaskStatus, TaskType


class OperationalTask(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    room_id: int = Field(gt=0)
    task_type: TaskType
    priority_score: int = Field(ge=0, le=100)
    priority_level: str
    status: TaskStatus = TaskStatus.PENDING
    assigned_staff_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = None
