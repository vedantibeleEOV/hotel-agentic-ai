import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import (
    IncidentStatus,
    MaintenanceCategory,
    MaintenanceResultStatus,
    MaintenanceSeverity,
)


class MaintenanceResult(BaseModel):
    room_id: int
    incident_id: UUID
    operational_task_id: Optional[UUID] = None
    category: MaintenanceCategory
    severity: MaintenanceSeverity
    sla_minutes: int
    assigned_technician_id: Optional[int] = None
    assigned_technician_name: Optional[str] = None
    previous_room_status: str
    new_room_status: str
    incident_status: IncidentStatus
    result_status: MaintenanceResultStatus
    reason: str
