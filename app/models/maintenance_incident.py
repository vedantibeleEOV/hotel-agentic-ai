import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.enums import IncidentStatus, MaintenanceCategory, MaintenanceSeverity


class MaintenanceIncident(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    room_id: int
    reported_by_staff_id: int
    description: str
    category: MaintenanceCategory
    severity: MaintenanceSeverity
    status: IncidentStatus = IncidentStatus.OPEN
    assigned_technician_id: Optional[int] = None
    sla_minutes: int
    created_at: datetime = Field(default_factory=datetime.now)
    operational_task_id: Optional[UUID] = None
