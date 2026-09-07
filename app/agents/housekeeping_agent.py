from typing import Any, Union
from uuid import uuid4

from app.models.enums import RoomStatus, TaskStatus, TaskType
from app.models.housekeeping_result import HousekeepingResult
from app.models.operational_task import OperationalTask
from app.models.room_readiness_result import RoomReadinessResult
from app.repositories.mock_hotel_repository import MockHotelRepository
from app.repositories.postgres_hotel_repository import PostgresHotelRepository


class HousekeepingAgent:
    def __init__(self, repository: Union[MockHotelRepository, PostgresHotelRepository, Any]):
        self.repository = repository
        self.activity_logs = []

    def assign_cleaning_task(self, readiness: RoomReadinessResult) -> HousekeepingResult:
        room = self.repository.get_room_by_id(readiness.room_id)
        if not room:
            raise ValueError(f"Room with ID {readiness.room_id} not found.")

        room_status_str = room.status.value if hasattr(room.status, "value") else str(room.status)
        if room_status_str != RoomStatus.DIRTY.value:
            raise ValueError(
                f"Room {readiness.room_id} must be in DIRTY status to assign housekeeping, but is {room_status_str}."
            )

        available_staff = self.repository.get_available_housekeeping_staff(room.floor)

        if not available_staff:
            event_id = uuid4()
            result = HousekeepingResult(
                event_id=event_id,
                room_id=readiness.room_id,
                task_id=None,
                task_status=None,
                assigned_staff_id=None,
                assigned_staff_name=None,
                previous_room_status=RoomStatus.DIRTY,
                new_room_status=RoomStatus.DIRTY,
                priority_score=readiness.priority_score,
                priority_level=readiness.priority_level,
                status="WAITING_FOR_STAFF",
                reason="No housekeeping employee is currently available for this room.",
            )
            self.activity_logs.append({
                "agent": "HOUSEKEEPING_AGENT",
                "action": "ESCALATE_NO_STAFF",
                "room_id": readiness.room_id,
                "priority_level": readiness.priority_level,
                "status": "ESCALATED",
            })
            return result

        task = OperationalTask(
            task_type=TaskType.ROOM_CLEANING,
            room_id=readiness.room_id,
            priority_score=readiness.priority_score,
            priority_level=readiness.priority_level,
            status=TaskStatus.PENDING,
            notes="Cleaning task created following guest checkout.",
        )
        saved_task = self.repository.save_operational_task(task)

        selected_staff = available_staff[0]
        updated_task = self.repository.assign_task_to_staff(saved_task.id, selected_staff.id)

        previous_status = room_status_str
        self.repository.update_room_status(room.id, RoomStatus.CLEANING)

        event_id = uuid4()
        result = HousekeepingResult(
            event_id=event_id,
            room_id=readiness.room_id,
            task_id=updated_task.id,
            task_status=updated_task.status,
            assigned_staff_id=selected_staff.id,
            assigned_staff_name=selected_staff.name,
            previous_room_status=previous_status,
            new_room_status=RoomStatus.CLEANING,
            priority_score=readiness.priority_score,
            priority_level=readiness.priority_level,
            status="HOUSEKEEPING_ASSIGNED",
            reason=f"Assigned to {selected_staff.name} based on floor match and lowest workload.",
        )

        self.activity_logs.append({
            "agent": "HOUSEKEEPING_AGENT",
            "event_id": event_id,
            "action": "ASSIGN_CLEANING_TASK",
            "room_id": readiness.room_id,
            "task_id": updated_task.id,
            "assigned_staff_id": selected_staff.id,
            "priority_score": readiness.priority_score,
            "priority_level": readiness.priority_level,
            "previous_status": previous_status,
            "new_status": RoomStatus.CLEANING,
            "status": "COMPLETED",
        })

        return result
