from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.models.enums import MaintenanceCategory, MaintenanceSeverity


class AgentRequest(BaseModel):
    query: str = Field(
        default="What room needs cleaning?",
        description="Prompt or query for the AI agent",
        json_schema_extra={"example": "What room needs cleaning?"}
    )


class CheckoutRequest(BaseModel):
    query: Optional[str] = Field(
        default=None,
        description="Prompt or room query",
        json_schema_extra={"example": "101"}
    )
    room_number: Optional[str] = Field(
        default=None,
        description="Room number for checkout",
        json_schema_extra={"example": "101"}
    )
    room: Optional[str] = Field(
        default=None,
        description="Alternative key for room number",
        json_schema_extra={"example": "101"}
    )

    def get_room(self) -> str:
        return self.room_number or self.room or self.query or "unknown"


class AgentResponse(BaseModel):
    status: str = Field("success", description="Execution status")
    agent_response: str = Field(..., description="Response text from LLM agent")


class IssueClassifierResponse(BaseModel):
    is_valid_issue: bool = Field(..., description="Whether the issue is a valid hotel maintenance problem")
    category: Optional[MaintenanceCategory] = Field(None, description="Classified maintenance category (null if invalid)")
    severity: Optional[MaintenanceSeverity] = Field(None, description="Classified maintenance severity (null if invalid)")
    affects_room_readiness: Optional[bool] = Field(
        None,
        description="True if issue makes room dirty, wet, unsafe, or unfit for a guest requiring cleaning again; False otherwise. Null if invalid.",
    )

    @model_validator(mode="after")
    def set_default_affects_room_readiness(self):
        if self.is_valid_issue and self.affects_room_readiness is None:
            self.affects_room_readiness = True
        elif not self.is_valid_issue:
            self.affects_room_readiness = None
        return self




