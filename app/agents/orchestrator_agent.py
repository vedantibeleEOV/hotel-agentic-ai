from typing import Any, Optional, Union
from uuid import uuid4
from datetime import datetime, timezone
from app.agents.issue_classifier_agent import IssueClassifierAgent
from app.config import evaluate_blocks_housekeeping
from app.models.checkout_event import CheckoutEvent
from app.models.enums import MaintenanceCategory, MaintenanceSeverity, RoomStatus, TaskStatus, TaskType
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

        # If category or severity is missing, auto-classify using IssueClassifierAgent with fallback
        if issue.category is None or issue.severity is None:
            is_valid, classified_cat, classified_sev, _ = (
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

        cat_val = issue.category.value if hasattr(issue.category, "value") else str(issue.category)
        sev_val = issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity)

        # Determine whether issue blocks housekeeping
        if issue.blocks_housekeeping is not None:
            blocks_housekeeping = bool(issue.blocks_housekeeping)
            hold_reason = issue.housekeeping_hold_reason or ("Manager override" if issue.is_human_override else "Manual flag")
        else:
            blocks_housekeeping, hold_reason = evaluate_blocks_housekeeping(
                category=cat_val,
                severity=sev_val,
                description=issue.description or "",
                is_safety_rule_applied=bool(issue.safety_rule_applied or sev_val.upper() == "CRITICAL"),
            )

        issue.blocks_housekeeping = blocks_housekeeping
        issue.housekeeping_hold_reason = hold_reason
        issue.affects_room_readiness = blocks_housekeeping

        room_status_str = room.status.value if hasattr(room.status, "value") else str(room.status)
        is_occupied = (room_status_str == "OCCUPIED")

        event_id = uuid4()
        category_str = cat_val

        # Decision Logic:
        # Rule 1: Room in turnaround flow (NOT OCCUPIED) AND blocks_housekeeping is True
        # -> Trigger Maintenance FIRST; hold/defer Housekeeping until maintenance completes.
        if not is_occupied and blocks_housekeeping:
            # Find any active Housekeeping cleaning task for this room and update to ON_HOLD
            all_tasks = list(self.repository.operational_tasks.values()) if hasattr(self.repository, "operational_tasks") else []
            active_cleaning_tasks = [
                t for t in all_tasks
                if t.room_id == issue.room_id
                and (t.task_type == TaskType.ROOM_CLEANING or getattr(t.task_type, "value", str(t.task_type)) == "ROOM_CLEANING")
                and (t.status in (TaskStatus.ASSIGNED, TaskStatus.PENDING, TaskStatus.IN_PROGRESS) or getattr(t.status, "value", str(t.status)) in ("ASSIGNED", "PENDING", "IN_PROGRESS"))
            ]
            for task in active_cleaning_tasks:
                prev_status_str = task.status.value if hasattr(task.status, "value") else str(task.status)
                task.status = TaskStatus.ON_HOLD
                note_suffix = f"On hold: {hold_reason}"
                if task.notes:
                    if note_suffix not in task.notes:
                        task.notes = f"{task.notes} | {note_suffix}"
                else:
                    task.notes = note_suffix

                self.repository.save_operational_task(task)

                if hasattr(self.repository, "log_activity"):
                    self.repository.log_activity(
                        task_id=task.id,
                        room_id=issue.room_id,
                        event_type="TASK_BLOCKED",
                        title="Task blocked",
                        actor_name="Maintenance Agent",
                        actor_role="AI Agent",
                        action="Housekeeping paused for maintenance",
                        outcome=hold_reason,
                    )

                self.activity_logs.append({
                    "agent": "OPERATIONS_ORCHESTRATOR",
                    "action": "HOLD_HOUSEKEEPING_TASK",
                    "room_id": issue.room_id,
                    "task_id": str(task.id),
                    "previous_task_status": prev_status_str,
                    "new_task_status": TaskStatus.ON_HOLD.value,
                    "reason": hold_reason,
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
                reason=f"Maintenance issue '{category_str}' blocks housekeeping during turnaround; executing Maintenance first before Housekeeping.",
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

        # Rule 2 & 3: blocks_housekeeping is False OR room is OCCUPIED
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
            reason=f"Maintenance issue reported: {category_str}; routing to maintenance agent (Housekeeping unaffected).",
        )

        log_entry = {
            "agent": "OPERATIONS_ORCHESTRATOR",
            "event_id": event_id,
            "action": "ROUTE_EVENT",
            "workflow": "MAINTENANCE_TICKET",
            "next_agent": "MAINTENANCE_AGENT",
            "room_id": issue.room_id,
            "affects_room_readiness": blocks_housekeeping if not is_occupied else None,
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
        all_tasks = list(self.repository.operational_tasks.values()) if hasattr(self.repository, "operational_tasks") else []
        on_hold_tasks = [
            t for t in all_tasks
            if t.room_id == room_id
            and (t.task_type == TaskType.ROOM_CLEANING or getattr(t.task_type, "value", str(t.task_type)) == "ROOM_CLEANING")
            and (t.status == TaskStatus.ON_HOLD or getattr(t.status, "value", str(t.status)) == "ON_HOLD")
        ]
        for task in on_hold_tasks:
            prev_status_str = task.status.value if hasattr(task.status, "value") else str(task.status)
            task.status = TaskStatus.ASSIGNED
            self.repository.save_operational_task(task)

            if hasattr(self.repository, "log_activity"):
                self.repository.log_activity(
                    task_id=task.id,
                    room_id=room_id,
                    event_type="TASK_RESUMED",
                    title="Task resumed",
                    actor_name="Operations Orchestrator",
                    actor_role="AI Agent",
                    action="Cleaning resumed following maintenance resolution",
                    outcome="Assigned",
                )

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

        if on_hold_tasks:
            # Update room status to CLEANING since housekeeping is now active
            self.repository.update_room_status(room_id, RoomStatus.CLEANING)
        else:
            # No on-hold cleaning task - verify post-maintenance and transition room to READY
            from app.agents.room_readiness_agent import RoomReadinessAgent
            readiness_agent = RoomReadinessAgent(self.repository)
            try:
                readiness_agent.verify_post_maintenance(room_id)
            except Exception:
                self.repository.update_room_status(room_id, RoomStatus.READY)

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


