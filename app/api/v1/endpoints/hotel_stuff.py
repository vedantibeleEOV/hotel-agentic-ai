from typing import Optional
from fastapi import APIRouter, Body, Query
from app.schemas.agent import AgentResponse, CheckoutRequest

router = APIRouter()


@router.post("/checkout-request", response_model=AgentResponse, tags=["hotel_stuff"])
async def checkout_request(
    query: Optional[str] = Query(default=None),
    room_number: Optional[str] = Query(default=None),
    room: Optional[str] = Query(default=None),
    request: Optional[CheckoutRequest] = Body(default=None),
):
    selected_room = (
        room_number
        or room
        or query
        or (request.get_room() if request else None)
        or "unknown"
    )
    return AgentResponse(
        status="success",
        agent_response=f"Room {selected_room} successfully checked out"
    )


