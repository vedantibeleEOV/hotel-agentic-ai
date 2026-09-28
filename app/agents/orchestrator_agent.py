from typing import Any, Optional, Union
from uuid import uuid4
from app.agents.issue_classifier_agent import IssueClassifierAgent
from app.models.checkout_event import CheckoutEvent
from app.models.enums import RoomStatus, TaskStatus, TaskType
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.models.orchestration_result import OrchestrationResult
from app.repositories.postgres_hotel_repository import PostgresHotelRepository


class OperationsOrchestratorAgent:
    def __init__(
        self,
        repository: Union[PostgresHotelRepository, Any],
        classifier_agent: Optional[Any] = None,
    ):
        self.repository = repository
        self.classifier_agent = classifier_agent or IssueClassifierAgent()
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

        # If category or severity is missing, auto-classify using IssueClassifierAgent
        affects_room_readiness = True
        if issue.category is None or issue.severity is None:
            try:
                classify_res = self.classifier_agent.classify(issue.description)
                is_valid = classify_res.get("is_valid_issue", False)
                if not is_valid:
                    self.activity_logs.append({
                        "agent": "OPERATIONS_ORCHESTRATOR",
                        "action": "REJECT_INVALID_ISSUE",
                        "room_id": issue.room_id,
                        "description": issue.description,
                        "status": "REJECTED",
                    })
                    raise ValueError("Please provide a valid maintenance issue description.")

                issue.category = classify_res.get("category")
                issue.severity = classify_res.get("severity")
                affects_room_readiness = classify_res.get("affects_room_readiness", True)
            except ValueError:
                raise
            except Exception:
                # Fallback to classify_with_fallback
                is_valid, classified_cat, classified_sev, needs_human_review = (
                    self.classifier_agent.classify_with_fallback(issue.description)
                )
                if not is_valid:
                    self.activity_logs.append({
                        "agent": "OPERATIONS_ORCHESTRATOR",
                        "action": "REJECT_INVALID_ISSUE",
                        "room_id": issue.room_id,
                        "description": issue.description,
                        "status": "REJECTED",
                    })
                    raise ValueError("Please provide a valid maintenance issue description.")
                issue.category = classified_cat
                issue.severity = classified_sev
                affects_room_readiness = True

        issue.affects_room_readiness = affects_room_readiness

        room_status_str = room.status.value if hasattr(room.status, "value") else str(room.status)
        is_occupied = (room_status_str == "OCCUPIED")

        event_id = uuid4()
        category_str = issue.category.value if hasattr(issue.category, "value") else str(issue.category)

        # Decision Logic:
        # Rule 1: Room in turnaround flow (NOT OCCUPIED) AND affects_room_readiness is True
        # -> Trigger Maintenance FIRST; hold/defer Housekeeping until maintenance completes.
        if not is_occupied and affects_room_readiness:
            # Find any active Housekeeping cleaning task for this room and update to ON_HOLD
            active_cleaning_tasks = [
                t for t in self.repository.operational_tasks.values()
                if t.room_id == issue.room_id
                and (t.task_type == TaskType.ROOM_CLEANING or getattr(t.task_type, "value", str(t.task_type)) == "ROOM_CLEANING")
                and (t.status in (TaskStatus.ASSIGNED, TaskStatus.PENDING, TaskStatus.IN_PROGRESS) or getattr(t.status, "value", str(t.status)) in ("ASSIGNED", "PENDING", "IN_PROGRESS"))
            ]
            for task in active_cleaning_tasks:
                prev_status_str = task.status.value if hasattr(task.status, "value") else str(task.status)
                task.status = TaskStatus.ON_HOLD
                self.repository.save_operational_task(task)
                self.activity_logs.append({
                    "agent": "OPERATIONS_ORCHESTRATOR",
                    "action": "HOLD_HOUSEKEEPING_TASK",
                    "room_id": issue.room_id,
                    "task_id": str(task.id),
                    "previous_task_status": prev_status_str,
                    "new_task_status": TaskStatus.ON_HOLD.value,
                    "reason": "Maintenance issue affects room readiness; pausing housekeeping task until maintenance completion.",
                    "status": "COMPLETED",
                })

            result = OrchestrationResult(
                event_id=event_id,
                workflow_name="MAINTENANCE_FIRST_TURNAROUND",
                current_agent="OPERATIONS_ORCHESTRATOR",
                next_agent="MAINTENANCE_AGENT",
                room_id=issue.room_id,
                reservation_id=None,
                next_reservation_id=None,
                status="ROUTED",
                reason=f"Maintenance issue '{category_str}' affects room readiness during turnaround; executing Maintenance first before Housekeeping.",
            )

            log_entry = {
                "agent": "OPERATIONS_ORCHESTRATOR",
                "event_id": event_id,
                "action": "ROUTE_EVENT",
                "workflow": "MAINTENANCE_FIRST_TURNAROUND",
                "next_agent": "MAINTENANCE_AGENT",
                "room_id": issue.room_id,
                "affects_room_readiness": True,
                "sequence": "MAINTENANCE_THEN_HOUSEKEEPING",
                "status": "COMPLETED",
            }
            self.activity_logs.append(log_entry)
            return result

        # Rule 2 & 3: affects_room_readiness is False OR room is OCCUPIED
        # -> Standard Maintenance routing (Housekeeping proceeds normally / independently).
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
            "affects_room_readiness": affects_room_readiness if not is_occupied else None,
            "is_occupied": is_occupied,
            "status": "COMPLETED",
        }
        self.activity_logs.append(log_entry)
        return result

    def handle_maintenance_completed(self, room_id: int) -> Optional[OrchestrationResult]:
        """Release and trigger housekeeping cleaning when maintenance is completed on a turnaround room."""
        room = self.repository.get_room_by_id(room_id)
        if not room:
            return None

        room_status_str = room.status.value if hasattr(room.status, "value") else str(room.status)
        if room_status_str == "OCCUPIED":
            return None

        # Find the housekeeping task for that room_id that is currently ON_HOLD and update back to ASSIGNED
        on_hold_tasks = [
            t for t in self.repository.operational_tasks.values()
            if t.room_id == room_id
            and (t.task_type == TaskType.ROOM_CLEANING or getattr(t.task_type, "value", str(t.task_type)) == "ROOM_CLEANING")
            and (t.status == TaskStatus.ON_HOLD or getattr(t.status, "value", str(t.status)) == "ON_HOLD")
        ]
        for task in on_hold_tasks:
            prev_status_str = task.status.value if hasattr(task.status, "value") else str(task.status)
            task.status = TaskStatus.ASSIGNED
            self.repository.save_operational_task(task)
            self.activity_logs.append({
                "agent": "OPERATIONS_ORCHESTRATOR",
                "action": "RELEASE_HOUSEKEEPING_TASK",
                "room_id": room_id,
                "task_id": str(task.id),
                "previous_task_status": prev_status_str,
                "new_task_status": TaskStatus.ASSIGNED.value,
                "reason": "Maintenance completed; releasing on-hold housekeeping task.",
                "status": "COMPLETED",
            })

        # Update room status to CLEANING since housekeeping is now active
        self.repository.update_room_status(room_id, RoomStatus.CLEANING)

        event_id = uuid4()
        result = OrchestrationResult(
            event_id=event_id,
            workflow_name="POST_MAINTENANCE_HOUSEKEEPING",
            current_agent="OPERATIONS_ORCHESTRATOR",
            next_agent="HOUSEKEEPING_AGENT",
            room_id=room_id,
            reservation_id=None,
            next_reservation_id=None,
            status="ROUTED",
            reason="Maintenance completed for turnaround room; releasing and triggering housekeeping cleaning task.",
        )

        log_entry = {
            "agent": "OPERATIONS_ORCHESTRATOR",
            "event_id": event_id,
            "action": "RELEASE_HOUSEKEEPING",
            "workflow": "POST_MAINTENANCE_HOUSEKEEPING",
            "next_agent": "HOUSEKEEPING_AGENT",
            "room_id": room_id,
            "status": "COMPLETED",
        }
        self.activity_logs.append(log_entry)
        return result

