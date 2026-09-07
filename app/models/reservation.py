import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from datetime import datetime
from pydantic import BaseModel, Field, model_validator



class Reservation(BaseModel):
    id: int = Field(..., gt=0)
    guest_id: int = Field(..., gt=0)
    room_id: int = Field(..., gt=0)
    check_in_time: datetime
    check_out_time: datetime
    early_check_in_requested: bool = False

    @model_validator(mode="after")
    def validate_dates(self):
        if self.check_out_time <= self.check_in_time:
            raise ValueError("Check-out time must be after check-in time.")
        return self
