from typing import Optional
from pydantic import BaseModel, Field


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


