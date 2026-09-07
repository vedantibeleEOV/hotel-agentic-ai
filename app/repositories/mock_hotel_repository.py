import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import logging
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

logger = logging.getLogger(__name__)


from app.models.enums import GuestType, RoomStatus, StaffRole, TaskStatus
from app.models.guest import Guest
from app.models.operational_task import OperationalTask
from app.models.reservation import Reservation
from app.models.room import Room
from app.models.staff import Staff


class MockHotelRepository:
    """Mock in-memory data repository for rooms, guests, reservations, staff, and tasks."""

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
                is_available=True,
                active_task_count=1,
            ),
            202: Staff(
                id=202,
                name="Neha Patil",
                role=StaffRole.HOUSEKEEPING,
                assigned_floor=4,
                is_available=True,
                active_task_count=0,
            ),
            203: Staff(
                id=203,
                name="Sunita More",
                role=StaffRole.HOUSEKEEPING,
                assigned_floor=3,
                is_available=True,
                active_task_count=0,
            ),
            301: Staff(
                id=301,
                name="Rakesh Jadhav",
                role=StaffRole.MAINTENANCE,
                assigned_floor=4,
                is_available=True,
                active_task_count=0,
            ),
        }

        self.operational_tasks: Dict[UUID, OperationalTask] = {}

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
        return task

    def get_operational_task_by_id(self, task_id: UUID) -> Optional[OperationalTask]:
        """Return matching OperationalTask or None if not found."""
        return self.operational_tasks.get(task_id)
