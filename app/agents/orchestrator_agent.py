from typing import Any, Union
from uuid import uuid4
from app.models.checkout_event import CheckoutEvent
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.models.orchestration_result import OrchestrationResult
from app.repositories.postgres_hotel_repository import PostgresHotelRepository


class OperationsOrchestratorAgent:
    def __init__(self, repository: Union[PostgresHotelRepository, Any]):
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

    def process_maintenance_report(self, issue: MaintenanceIssueReport) -> OrchestrationResult:
        room = self.repository.get_room_by_id(issue.room_id)
        if not room:
            raise ValueError(f"Room with ID {issue.room_id} not found.")

        event_id = uuid4()
        category_str = issue.category.value if hasattr(issue.category, "value") else str(issue.category)

        result = OrchestrationResult(
            event_id=event_id,
            workflow_name="MAINTENANCE_TICKET",
            current_agent="OPERATIONS_ORCHESTRATOR",
            next_agent="MAINTENANCE_AGENT",
            room_id=issue.room_id,
            reservation_id=None,
            next_reservation_id=None,
            status="ROUTED",
            reason=f"Maintenance issue reported: {category_str}; routing to maintenance agent.",
        )

        log_entry = {
            "agent": "OPERATIONS_ORCHESTRATOR",
            "event_id": event_id,
            "action": "ROUTE_EVENT",
            "workflow": "MAINTENANCE_TICKET",
            "next_agent": "MAINTENANCE_AGENT",
            "room_id": issue.room_id,
            "status": "COMPLETED",
        }
        self.activity_logs.append(log_entry)
        return result
