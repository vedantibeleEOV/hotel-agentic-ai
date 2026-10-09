import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.enums import IncidentStatus, MaintenanceCategory, MaintenanceSeverity


class MaintenanceIncident(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    room_id: int
    reported_by_staff_id: Optional[int] = None
    description: str
    category: MaintenanceCategory
    severity: MaintenanceSeverity
    affects_room_readiness: Optional[bool] = None
    status: IncidentStatus = IncidentStatus.OPEN
    assigned_technician_id: Optional[int] = None
    sla_minutes: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    operational_task_id: Optional[UUID] = None

    # AI decision metadata and resolution tracking
    category_reason: Optional[str] = None
    severity_reason: Optional[str] = None
    confidence_score: Optional[str] = None
    decision_source: Optional[str] = "RULE_TABLE"
    safety_rule_applied: Optional[bool] = False
    safety_rule_text: Optional[str] = None
    technician_match_reason: Optional[str] = None
    is_fallback: Optional[bool] = False
    needs_human_review: Optional[bool] = False
    resolved_at: Optional[datetime] = None
    original_ai_decision: Optional[Dict[str, Any]] = None
    blocks_housekeeping: Optional[bool] = None
    housekeeping_hold_reason: Optional[str] = None

