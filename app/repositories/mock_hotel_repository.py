import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import logging
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

logger = logging.getLogger(__name__)


from app.models.enums import (
    GuestType,
    IncidentStatus,
    MaintenanceSkill,
    RoomStatus,
    StaffRole,
    TaskStatus,
)
from app.models.guest import Guest
from app.models.maintenance_incident import MaintenanceIncident
from app.models.operational_task import OperationalTask
from app.models.reservation import Reservation
from app.models.room import Room
from app.models.staff import Staff


class MockHotelRepository:
    """Mock in-memory data repository for rooms, guests, reservations, staff, tasks, and maintenance incidents."""

    def __init__(self):
        self.rooms: Dict[int, Room] = {
            1: Room(
                id=1,
                property_id=1,
                room_number="405",
                floor=4,
                room_type="DELUXE",
                status=RoomStatus.OCCUPIED,
            ),
            2: Room(
                id=2,
                property_id=1,
                room_number="406",
                floor=4,
                room_type="STANDARD",
                status=RoomStatus.READY,
            ),
        }

        self.guests: Dict[int, Guest] = {
            101: Guest(
                id=101,
                first_name="Rahul",
                last_name="Patil",
                guest_type=GuestType.REGULAR,
            ),
            102: Guest(
                id=102,
                first_name="Amit",
                last_name="Sharma",
                guest_type=GuestType.VIP,
            ),
        }

        self.reservations: Dict[int, Reservation] = {
            5001: Reservation(
                id=5001,
                guest_id=101,
                room_id=1,
                check_in_time=datetime(2026, 8, 28, 14, 0),
                check_out_time=datetime(2026, 8, 29, 10, 0),
                early_check_in_requested=False,
            ),
            5002: Reservation(
                id=5002,
                guest_id=102,
                room_id=2,
                check_in_time=datetime(2026, 8, 29, 13, 0),
                check_out_time=datetime(2026, 8, 31, 10, 0),
                early_check_in_requested=True,
            ),
        }

        self.staff: Dict[int, Staff] = {
            201: Staff(
                id=201,
                name="Priya Deshmukh",
                role=StaffRole.HOUSEKEEPING,
                assigned_floor=4,
                assigned_room_id=1,
                is_available=True,
                active_task_count=1,
            ),
            202: Staff(
                id=202,
                name="Neha Patil",
                role=StaffRole.HOUSEKEEPING,
                assigned_floor=4,
                assigned_room_id=None,
                is_available=True,
                active_task_count=0,
            ),
            203: Staff(
                id=203,
                name="Sunita More",
                role=StaffRole.HOUSEKEEPING,
                assigned_floor=3,
                assigned_room_id=None,
                is_available=True,
                active_task_count=0,
            ),
            301: Staff(
                id=301,
                name="Rakesh Jadhav",
                role=StaffRole.MAINTENANCE,
                assigned_floor=4,
                assigned_room_id=None,
                is_available=True,
                active_task_count=0,
                skills=[MaintenanceSkill.HVAC, MaintenanceSkill.GENERAL],
            ),
            302: Staff(
                id=302,
                name="Suresh Pawar",
                role=StaffRole.MAINTENANCE,
                assigned_floor=3,
                assigned_room_id=None,
                is_available=True,
                active_task_count=1,
                skills=[
                    MaintenanceSkill.ELECTRICAL,
                    MaintenanceSkill.PLUMBING,
                    MaintenanceSkill.GENERAL,
                ],
            ),

        }

        self.operational_tasks: Dict[UUID, OperationalTask] = {}
        self.maintenance_incidents: Dict[UUID, MaintenanceIncident] = {}

    def get_room_by_id(self, room_id: int) -> Optional[Room]:
        """Return matching Room object or None for unknown ID."""
        return self.rooms.get(room_id)

    def get_guest_by_id(self, guest_id: int) -> Optional[Guest]:
        """Return matching Guest object or None for unknown ID."""
        return self.guests.get(guest_id)

    def get_reservation_by_id(self, reservation_id: int) -> Optional[Reservation]:
        """Return matching Reservation object or None for unknown ID."""
        return self.reservations.get(reservation_id)

    def get_next_reservation_for_room(
        self, room_id: int, after_time: datetime
    ) -> Optional[Reservation]:
        """Find the earliest upcoming reservation for a room after a given time."""
        after_time_naive = after_time.replace(tzinfo=None) if after_time.tzinfo else after_time
        future_reservations = [
            res
            for res in self.reservations.values()
            if res.room_id == room_id
            and (res.check_in_time.replace(tzinfo=None) if res.check_in_time.tzinfo else res.check_in_time) > after_time_naive
        ]
        if not future_reservations:
            return None
        future_reservations.sort(
            key=lambda r: r.check_in_time.replace(tzinfo=None) if r.check_in_time.tzinfo else r.check_in_time
        )
        return future_reservations[0]

    def update_room_status(self, room_id: int, new_status: str) -> None:
        """Update the status of a room by room_id."""
        room = self.rooms.get(room_id)
        if not room:
            raise ValueError(f"Room with ID {room_id} not found.")
        room.status = new_status

    def get_available_housekeeping_staff(self, room_floor: int) -> List[Staff]:
        """Return available housekeeping staff sorted by floor proximity, active task count, and ID."""
        logger.info(f"Searching available housekeeping staff for room floor: {room_floor}")
        filtered_staff = [
            s
            for s in self.staff.values()
            if s.role == StaffRole.HOUSEKEEPING and s.is_available
        ]
        logger.info(
            f"Found {len(filtered_staff)} available housekeeping staff out of {len(self.staff)} total staff records."
        )
        filtered_staff.sort(
            key=lambda s: (0 if s.assigned_floor == room_floor else 1, s.active_task_count, s.id)
        )
        if filtered_staff:
            sorted_details = [
                f"ID={s.id} ({s.name}, Floor={s.assigned_floor}, Tasks={s.active_task_count})"
                for s in filtered_staff
            ]
            logger.info(f"Sorted housekeeping staff priority order: {sorted_details}")
        else:
            logger.warning(f"No available housekeeping staff found for room floor {room_floor}.")
        return filtered_staff

    def save_operational_task(self, task: OperationalTask) -> OperationalTask:
        """Store task in self.operational_tasks keyed by task.id and return it."""
        self.operational_tasks[task.id] = task
        return task

    def assign_task_to_staff(self, task_id: UUID, staff_id: int) -> OperationalTask:
        """Assign a task to a staff member and update statuses."""
        task = self.operational_tasks.get(task_id)
        if not task:
            raise ValueError(f"Task with ID {task_id} not found.")
        staff = self.staff.get(staff_id)
        if not staff:
            raise ValueError(f"Staff with ID {staff_id} not found.")
        task.assigned_staff_id = staff_id
        task.status = TaskStatus.ASSIGNED
        staff.active_task_count += 1
        staff.is_available = False
        staff.assigned_room_id = task.room_id
        return task

    def get_operational_task_by_id(self, task_id: UUID) -> Optional[OperationalTask]:
        """Return matching OperationalTask or None if not found."""
        return self.operational_tasks.get(task_id)

    def get_available_maintenance_staff(
        self, required_skill: MaintenanceSkill, room_floor: Optional[int] = None
    ) -> list[Staff]:
        """Return available maintenance staff having the required skill sorted by floor proximity, active task count, and ID."""
        filtered = [
            s
            for s in self.staff.values()
            if s.role == StaffRole.MAINTENANCE
            and s.is_available
            and required_skill in s.skills
        ]
        filtered.sort(
            key=lambda s: (
                0 if (room_floor is not None and s.assigned_floor == room_floor) else 1,
                s.active_task_count,
                s.id,
            )
        )
        return filtered

    def save_maintenance_incident(
        self, incident: MaintenanceIncident
    ) -> MaintenanceIncident:
        """Store incident in self.maintenance_incidents keyed by incident.id and return it."""
        self.maintenance_incidents[incident.id] = incident
        return incident

    def get_maintenance_incident_by_id(
        self, incident_id
    ) -> Optional[MaintenanceIncident]:
        """Return matching MaintenanceIncident or None if not found."""
        return self.maintenance_incidents.get(incident_id)

    def assign_incident_to_technician(
        self, incident_id, technician_id: int
    ) -> MaintenanceIncident:
        """Assign an incident to a technician and update statuses."""
        incident = self.maintenance_incidents.get(incident_id)
        if not incident:
            raise ValueError(f"Maintenance incident with ID {incident_id} not found.")

        technician = self.staff.get(technician_id)
        if not technician:
            raise ValueError(f"Staff with ID {technician_id} not found.")

        incident.assigned_technician_id = technician_id
        incident.status = IncidentStatus.ASSIGNED

        technician.is_available = False
        technician.assigned_room_id = incident.room_id

        return incident

    def complete_task(self, task_id: UUID) -> OperationalTask:
        """Mark an operational task as completed, release assigned staff, and update room status."""
        task = self.operational_tasks.get(task_id)
        if not task:
            raise ValueError(f"Task with ID {task_id} not found.")

        if task.status == TaskStatus.COMPLETED or task.status == TaskStatus.COMPLETED.value:
            raise ValueError(f"Task {task_id} is already completed.")

        task.status = TaskStatus.COMPLETED

        # Update associated maintenance incident if one exists
        for inc in self.maintenance_incidents.values():
            if inc.operational_task_id == task_id or (
                inc.room_id == task.room_id
                and inc.assigned_technician_id == task.assigned_staff_id
                and inc.status == IncidentStatus.ASSIGNED
            ):
                inc.status = IncidentStatus.RESOLVED

        # Release assigned staff
        if task.assigned_staff_id:
            staff = self.staff.get(task.assigned_staff_id)
            if staff:
                remaining_staff_tasks = [
                    t for t in self.operational_tasks.values()
                    if t.assigned_staff_id == staff.id
                    and t.id != task_id
                    and t.status in (TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS)
                ]
                staff.active_task_count = len(remaining_staff_tasks)

                if not remaining_staff_tasks:
                    staff.is_available = True
                    staff.assigned_room_id = None
                else:
                    staff.assigned_room_id = remaining_staff_tasks[0].room_id

        # Update room status if no other active tasks for this room
        room = self.rooms.get(task.room_id)
        if room:
            remaining_room_tasks = [
                t for t in self.operational_tasks.values()
                if t.room_id == task.room_id
                and t.id != task_id
                and t.status in (TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS)
            ]

            if not remaining_room_tasks:
                room.status = RoomStatus.READY
            else:
                has_maintenance = any(
                    t.task_type == TaskType.ROOM_MAINTENANCE for t in remaining_room_tasks
                )
                if has_maintenance:
                    room.status = RoomStatus.MAINTENANCE
                else:
                    room.status = RoomStatus.CLEANING

        return task

