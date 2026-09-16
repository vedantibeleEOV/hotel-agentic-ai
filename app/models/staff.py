import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from typing import Optional
from pydantic import BaseModel, Field

from app.models.enums import MaintenanceSkill, StaffRole


class Staff(BaseModel):
    id: int = Field(gt=0)
    name: str = Field(max_length=100)
    role: StaffRole
    assigned_floor: Optional[int] = Field(default=None, ge=0)
    assigned_room_id: Optional[int] = Field(default=None, ge=1)
    is_available: bool = True
    active_task_count: int = Field(default=0, ge=0)
    skills: list[MaintenanceSkill] = Field(default_factory=list)

