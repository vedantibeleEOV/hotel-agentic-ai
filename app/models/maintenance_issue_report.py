import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from pydantic import BaseModel, Field

from app.models.enums import MaintenanceCategory, MaintenanceSeverity


class MaintenanceIssueReport(BaseModel):
    room_id: int = Field(gt=0)
    reported_by_staff_id: int = Field(gt=0)
    description: str = Field(min_length=5, max_length=500)
    category: MaintenanceCategory
    severity: MaintenanceSeverity
