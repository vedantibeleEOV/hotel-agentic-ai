from fastapi import APIRouter, HTTPException, status

from app.agents.housekeeping_agent import HousekeepingAgent
from app.agents.orchestrator_agent import OperationsOrchestratorAgent
from app.agents.room_readiness_agent import RoomReadinessAgent
from app.models.checkout_event import CheckoutEvent
from app.models.enums import RoomStatus
from app.database.seed import seed_db
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter()
repository = PostgresHotelRepository()
orchestrator = OperationsOrchestratorAgent(repository)
room_readiness_agent = RoomReadinessAgent(repository)
housekeeping_agent = HousekeepingAgent(repository)



@router.post(
    "/events/checkout",
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        202: {
            "description": "Checkout event accepted and routed successfully.",
        },
        400: {
            "description": "Bad Request - Property ID or Reservation mismatch",
        },
        404: {
            "description": "Not Found - Room or Reservation not found",
        },
        409: {
            "description": "Conflict - Room is not in OCCUPIED status to process checkout",
        },
    },
)
async def process_checkout_event(event: CheckoutEvent):
    room = repository.get_room_by_id(event.room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    reservation = repository.get_reservation_by_id(event.reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )

    if room.property_id != event.property_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property ID does not match the room's property"
        )

    if reservation.room_id != event.room_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation does not belong to the specified room"
        )

    orchestration_result = orchestrator.process_checkout_event(event)
    try:
        room_readiness_result = room_readiness_agent.evaluate_checkout(event)
        housekeeping_result = housekeeping_agent.assign_cleaning_task(room_readiness_result)
    except ValueError as e:
        err_msg = str(e)
        if "must be in OCCUPIED status" in err_msg or "must be in DIRTY status" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=err_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    return {
        "message": "Checkout event accepted and routed",
        "processing_status": "ROUTED",
        "orchestration": orchestration_result,
        "room_readiness": room_readiness_result,
        "housekeeping": housekeeping_result,
    }


@router.post("/reset", summary="Reset PostgreSQL repository data and agent logs back to initial state")
async def reset_system_state():
    """Reset repository data and agent activity logs to fresh initial state."""
    global repository, orchestrator, room_readiness_agent, housekeeping_agent
    seed_db()
    repository = PostgresHotelRepository()
    orchestrator = OperationsOrchestratorAgent(repository)
    room_readiness_agent = RoomReadinessAgent(repository)
    housekeeping_agent = HousekeepingAgent(repository)
    room1 = repository.get_room_by_id(1)
    return {
        "message": "System state successfully reset in PostgreSQL database",
        "room_1_status": room1.status if room1 else None,
    }



@router.get("/status/system", summary="Inspect system state, rooms, staff, tasks, and agent activity logs")
async def get_system_status():
    """Inspect current in-memory system status and agent logs."""
    return {
        "rooms": repository.rooms,
        "staff": repository.staff,
        "operational_tasks": repository.operational_tasks,
        "activity_logs": {
            "room_readiness_agent": room_readiness_agent.activity_logs,
            "housekeeping_agent": housekeeping_agent.activity_logs,
        },
    }


@router.put("/rooms/{room_id}/status", summary="Update or reset a room status (e.g. back to OCCUPIED)")
async def update_room_status(room_id: int, new_status: RoomStatus):
    """Update or reset room status in memory."""
    try:
        repository.update_room_status(room_id, new_status)
        return {
            "message": f"Room {room_id} status updated to {new_status.value}",
            "room": repository.get_room_by_id(room_id),
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
