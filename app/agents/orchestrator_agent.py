from typing import Any, Union
from app.models.checkout_event import CheckoutEvent
from app.models.orchestration_result import OrchestrationResult
from app.repositories.mock_hotel_repository import MockHotelRepository
from app.repositories.postgres_hotel_repository import PostgresHotelRepository


class OperationsOrchestratorAgent:
    def __init__(self, repository: Union[MockHotelRepository, PostgresHotelRepository, Any]):
        self.repository = repository
        self.activity_logs = []

    def process_checkout_event(self, event: CheckoutEvent) -> OrchestrationResult:
        room = self.repository.get_room_by_id(event.room_id)
        if not room:
            raise ValueError(f"Room with ID {event.room_id} not found.")

        reservation = self.repository.get_reservation_by_id(event.reservation_id)
        if not reservation:
            raise ValueError(f"Reservation with ID {event.reservation_id} not found.")

        if reservation.room_id != event.room_id:
            raise ValueError(
                f"Reservation {event.reservation_id} does not belong to room {event.room_id}."
            )

        next_reservation = self.repository.get_next_reservation_for_room(
            room_id=event.room_id, after_time=event.checkout_time
        )
        next_reservation_id = next_reservation.id if next_reservation else None

        result = OrchestrationResult(
            event_id=event.event_id,
            workflow_name="ROOM_TURNAROUND",
            current_agent="OPERATIONS_ORCHESTRATOR",
            next_agent="ROOM_READINESS_AGENT",
            room_id=event.room_id,
            reservation_id=event.reservation_id,
            next_reservation_id=next_reservation_id,
            status="ROUTED",
            reason="Checkout received; room-turnaround workflow is required.",
        )

        log_entry = {
            "agent": "OPERATIONS_ORCHESTRATOR",
            "event_id": event.event_id,
            "action": "ROUTE_EVENT",
            "workflow": "ROOM_TURNAROUND",
            "next_agent": "ROOM_READINESS_AGENT",
            "room_id": event.room_id,
            "status": "COMPLETED",
        }
        self.activity_logs.append(log_entry)
        return result
