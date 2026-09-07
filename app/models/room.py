import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from pydantic import BaseModel, Field

from app.models.enums import RoomStatus


class Room(BaseModel):
    id: int = Field(gt=0)
    property_id: int = Field(gt=0)
    room_number: str = Field(min_length=1, max_length=10)
    floor: int = Field(ge=0)
    room_type: str = Field(min_length=1, max_length=50)
    status: RoomStatus
