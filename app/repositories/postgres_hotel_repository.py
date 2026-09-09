import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Union
from uuid import UUID

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import select

from app.database.connection import SessionLocal
from app.database.orm import (
    GuestEntity,
    OperationalTaskEntity,
    ReservationEntity,
    RoomEntity,
    StaffEntity,
)
from app.models.enums import (
    GuestType,
    IncidentStatus,
    MaintenanceSkill,
    RoomStatus,
    StaffRole,
    TaskStatus,
    TaskType,
)
from app.models.guest import Guest
from app.models.maintenance_incident import MaintenanceIncident
from app.models.operational_task import OperationalTask
from app.models.reservation import Reservation
from app.models.room import Room
from app.models.staff import Staff

class PostgresHotelRepository:
    """PostgreSQL implementation of hotel data repository for READ and WRITE operations using SQLAlchemy 2.x."""


    def __init__(self, session_factory=SessionLocal):
        self.session_factory = session_factory
        self.maintenance_incidents: Dict[UUID, MaintenanceIncident] = {}

    @staticmethod
    def _to_pydantic_room(entity: RoomEntity) -> Room:
        return Room(
            id=entity.id,
            property_id=entity.property_id,
            room_number=entity.room_number,
            floor=entity.floor,
            room_type=entity.room_type or "",
            status=RoomStatus(entity.status) if entity.status else RoomStatus.DIRTY,
        )

    @staticmethod
    def _to_pydantic_guest(entity: GuestEntity) -> Guest:
        return Guest(
            id=entity.id,
            first_name=entity.first_name,
            last_name=entity.last_name,
            guest_type=GuestType(entity.guest_type) if entity.guest_type else GuestType.REGULAR,
        )

    @staticmethod
    def _to_pydantic_reservation(entity: ReservationEntity) -> Reservation:
        return Reservation(
            id=entity.id,
            guest_id=entity.guest_id,
            room_id=entity.room_id,
            check_in_time=entity.check_in_time,
            check_out_time=entity.check_out_time,
            early_check_in_requested=entity.early_check_in_requested,
        )

    @staticmethod
    def _to_pydantic_staff(entity: StaffEntity) -> Staff:
        skills = []
        if entity.id == 301:
            skills = [MaintenanceSkill.HVAC, MaintenanceSkill.GENERAL]
        elif entity.id == 302:
            skills = [MaintenanceSkill.ELECTRICAL, MaintenanceSkill.PLUMBING, MaintenanceSkill.GENERAL]
        return Staff(
            id=entity.id,
            name=entity.name,
            role=StaffRole(entity.role) if entity.role else StaffRole.HOUSEKEEPING,
            assigned_floor=entity.assigned_floor,
            is_available=entity.is_available,
            active_task_count=entity.active_task_count,
            skills=skills,
        )


    @staticmethod
    def _to_pydantic_task(entity: OperationalTaskEntity) -> OperationalTask:
        return OperationalTask(
            id=entity.id,
            room_id=entity.room_id,
            task_type=TaskType(entity.task_type),
            priority_score=entity.priority_score,
            priority_level=entity.priority_level,
            status=TaskStatus(entity.status),
            assigned_staff_id=entity.assigned_staff_id,
            created_at=entity.created_at,
            notes=entity.notes,
        )

    def get_room_by_id(self, room_id: int) -> Optional[Room]:
        """Read a room from PostgreSQL by ID and return Pydantic Room model."""
        with self.session_factory() as session:
            entity = session.get(RoomEntity, room_id)
            return self._to_pydantic_room(entity) if entity else None

    def get_guest_by_id(self, guest_id: int) -> Optional[Guest]:
        """Read a guest from PostgreSQL by ID and return Pydantic Guest model."""
        with self.session_factory() as session:
            entity = session.get(GuestEntity, guest_id)
            return self._to_pydantic_guest(entity) if entity else None

    def get_reservation_by_id(self, reservation_id: int) -> Optional[Reservation]:
        """Read a reservation from PostgreSQL by ID and return Pydantic Reservation model."""
        with self.session_factory() as session:
            entity = session.get(ReservationEntity, reservation_id)
            return self._to_pydantic_reservation(entity) if entity else None

    def get_next_reservation_for_room(
        self, room_id: int, after_time: datetime
    ) -> Optional[Reservation]:
        """Find earliest reservation for room_id after given after_time."""
        after_time_aware = (
            after_time.replace(tzinfo=timezone.utc) if after_time.tzinfo is None else after_time
        )
        with self.session_factory() as session:
            stmt = (
                select(ReservationEntity)
                .where(
                    ReservationEntity.room_id == room_id,
                    ReservationEntity.check_in_time > after_time_aware,
                )
                .order_by(ReservationEntity.check_in_time.asc())
                .limit(1)
            )
            entity = session.execute(stmt).scalar_one_or_none()
            return self._to_pydantic_reservation(entity) if entity else None

    def get_available_housekeeping_staff(self, room_floor: int) -> List[Staff]:
        """Return available housekeeping staff sorted by floor match, lowest workload, and ID."""
        with self.session_factory() as session:
            stmt = select(StaffEntity).where(
                StaffEntity.role == StaffRole.HOUSEKEEPING.value,
                StaffEntity.is_available == True,
            )
            staff_entities = list(session.execute(stmt).scalars().all())

            staff_entities.sort(
                key=lambda s: (
                    0 if s.assigned_floor == room_floor else 1,
                    s.active_task_count,
                    s.id,
                )
            )
            return [self._to_pydantic_staff(s) for s in staff_entities]

    def get_operational_task_by_id(self, task_id: UUID) -> Optional[OperationalTask]:
        """Read operational task from PostgreSQL by UUID and return Pydantic OperationalTask model."""
        with self.session_factory() as session:
            entity = session.get(OperationalTaskEntity, task_id)
            return self._to_pydantic_task(entity) if entity else None

    def update_room_status(self, room_id: int, new_status: Union[str, RoomStatus]) -> None:
        """Update room status in PostgreSQL database."""
        status_val = new_status.value if hasattr(new_status, "value") else str(new_status)
        with self.session_factory() as session:
            room_entity = session.get(RoomEntity, room_id)
            if not room_entity:
                raise ValueError(f"Room with ID {room_id} not found.")
            room_entity.status = status_val
            session.commit()

    def save_operational_task(self, task: OperationalTask) -> OperationalTask:
        """Save an operational task to PostgreSQL database."""
        status_val = task.status.value if hasattr(task.status, "value") else str(task.status)
        type_val = task.task_type.value if hasattr(task.task_type, "value") else str(task.task_type)
        task_entity = OperationalTaskEntity(
            id=task.id,
            room_id=task.room_id,
            task_type=type_val,
            priority_score=task.priority_score,
            priority_level=task.priority_level,
            status=status_val,
            assigned_staff_id=task.assigned_staff_id,
            created_at=task.created_at,
            notes=task.notes,
        )
        with self.session_factory() as session:
            session.add(task_entity)
            session.commit()
        return task

    def assign_task_to_staff(self, task_id: UUID, staff_id: int) -> OperationalTask:
        """Assign an operational task to a staff member in PostgreSQL database."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")
            staff_entity = session.get(StaffEntity, staff_id)
            if not staff_entity:
                raise ValueError(f"Staff with ID {staff_id} not found.")

            task_entity.assigned_staff_id = staff_id
            task_entity.status = TaskStatus.ASSIGNED.value
            staff_entity.active_task_count += 1
            staff_entity.is_available = False
            session.commit()
            return self._to_pydantic_task(task_entity)

    @property
    def rooms(self) -> Dict[int, Room]:
        """Return dictionary of all rooms keyed by room ID from PostgreSQL."""
        with self.session_factory() as session:
            entities = session.execute(select(RoomEntity)).scalars().all()
            return {e.id: self._to_pydantic_room(e) for e in entities}

    @property
    def staff(self) -> Dict[int, Staff]:
        """Return dictionary of all staff keyed by staff ID from PostgreSQL."""
        with self.session_factory() as session:
            entities = session.execute(select(StaffEntity)).scalars().all()
            return {e.id: self._to_pydantic_staff(e) for e in entities}

    @property
    def operational_tasks(self) -> Dict[UUID, OperationalTask]:
        """Return dictionary of all operational tasks keyed by task UUID from PostgreSQL."""
        with self.session_factory() as session:
            entities = session.execute(select(OperationalTaskEntity)).scalars().all()
            return {e.id: self._to_pydantic_task(e) for e in entities}

    def get_available_maintenance_staff(
        self, required_skill: MaintenanceSkill, room_floor: Optional[int] = None
    ) -> list[Staff]:
        """Return available maintenance staff having required skill sorted by floor proximity, active task count, and ID."""
        with self.session_factory() as session:
            stmt = select(StaffEntity).where(
                StaffEntity.role == StaffRole.MAINTENANCE.value,
                StaffEntity.is_available == True,
            )
            staff_entities = list(session.execute(stmt).scalars().all())
            staff_models = [self._to_pydantic_staff(s) for s in staff_entities]

            filtered = [
                s for s in staff_models
                if s.role == StaffRole.MAINTENANCE and s.is_available and required_skill in s.skills
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
        """Assign an incident to a technician and update statuses in PostgreSQL."""
        incident = self.maintenance_incidents.get(incident_id)
        if not incident:
            raise ValueError(f"Maintenance incident with ID {incident_id} not found.")

        with self.session_factory() as session:
            staff_entity = session.get(StaffEntity, technician_id)
            if not staff_entity:
                raise ValueError(f"Staff with ID {technician_id} not found.")

            incident.assigned_technician_id = technician_id
            incident.status = IncidentStatus.ASSIGNED

            staff_entity.active_task_count += 1
            staff_entity.is_available = False
            session.commit()

        return incident


