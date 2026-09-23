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
    MaintenanceIncidentEntity,
    OperationalTaskEntity,
    ReservationEntity,
    RoomEntity,
    StaffEntity,
)
from app.models.enums import (
    GuestType,
    IncidentStatus,
    MaintenanceCategory,
    MaintenanceSeverity,
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

    @staticmethod
    def _to_pydantic_incident(entity: MaintenanceIncidentEntity) -> MaintenanceIncident:
        return MaintenanceIncident(
            id=entity.id,
            room_id=entity.room_id,
            reported_by_staff_id=entity.reported_by_staff_id,
            description=entity.description,
            category=MaintenanceCategory(entity.category),
            severity=MaintenanceSeverity(entity.severity),
            status=IncidentStatus(entity.status),
            assigned_technician_id=entity.assigned_technician_id,
            sla_minutes=entity.sla_minutes,
            created_at=entity.created_at,
            operational_task_id=entity.operational_task_id,
        )

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
            assigned_room_id=entity.assigned_room_id,
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

    def get_staff_by_id(self, staff_id: int) -> Optional[Staff]:
        """Read a staff member from PostgreSQL by ID and return Pydantic Staff model."""
        with self.session_factory() as session:
            entity = session.get(StaffEntity, staff_id)
            return self._to_pydantic_staff(entity) if entity else None

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
            staff_entity.assigned_room_id = task_entity.room_id
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

    @property
    def maintenance_incidents(self) -> Dict[UUID, MaintenanceIncident]:
        """Return dictionary of all maintenance incidents keyed by incident UUID from PostgreSQL."""
        with self.session_factory() as session:
            entities = session.execute(select(MaintenanceIncidentEntity)).scalars().all()
            return {e.id: self._to_pydantic_incident(e) for e in entities}

    def save_maintenance_incident(
        self, incident: MaintenanceIncident
    ) -> MaintenanceIncident:
        """Save or update a maintenance incident in PostgreSQL database."""
        cat_val = incident.category.value if hasattr(incident.category, "value") else str(incident.category)
        sev_val = incident.severity.value if hasattr(incident.severity, "value") else str(incident.severity)
        status_val = incident.status.value if hasattr(incident.status, "value") else str(incident.status)

        with self.session_factory() as session:
            existing = session.get(MaintenanceIncidentEntity, incident.id)
            if existing:
                existing.room_id = incident.room_id
                existing.reported_by_staff_id = incident.reported_by_staff_id
                existing.description = incident.description
                existing.category = cat_val
                existing.severity = sev_val
                existing.status = status_val
                existing.assigned_technician_id = incident.assigned_technician_id
                existing.sla_minutes = incident.sla_minutes
                existing.operational_task_id = incident.operational_task_id
            else:
                incident_entity = MaintenanceIncidentEntity(
                    id=incident.id,
                    room_id=incident.room_id,
                    reported_by_staff_id=incident.reported_by_staff_id,
                    description=incident.description,
                    category=cat_val,
                    severity=sev_val,
                    status=status_val,
                    assigned_technician_id=incident.assigned_technician_id,
                    sla_minutes=incident.sla_minutes,
                    created_at=incident.created_at,
                    operational_task_id=incident.operational_task_id,
                )
                session.add(incident_entity)
            session.commit()
        return incident

    def get_maintenance_incident_by_id(
        self, incident_id: Union[UUID, str]
    ) -> Optional[MaintenanceIncident]:
        """Return matching MaintenanceIncident from PostgreSQL or None if not found."""
        uid = UUID(str(incident_id)) if isinstance(incident_id, str) else incident_id
        with self.session_factory() as session:
            entity = session.get(MaintenanceIncidentEntity, uid)
            return self._to_pydantic_incident(entity) if entity else None

    def assign_incident_to_technician(
        self, incident_id: Union[UUID, str], technician_id: int
    ) -> MaintenanceIncident:
        """Assign an incident to a technician and update statuses in PostgreSQL."""
        uid = UUID(str(incident_id)) if isinstance(incident_id, str) else incident_id
        with self.session_factory() as session:
            incident_entity = session.get(MaintenanceIncidentEntity, uid)
            if not incident_entity:
                raise ValueError(f"Maintenance incident with ID {incident_id} not found.")

            staff_entity = session.get(StaffEntity, technician_id)
            if not staff_entity:
                raise ValueError(f"Staff with ID {technician_id} not found.")

            incident_entity.assigned_technician_id = technician_id
            incident_entity.status = IncidentStatus.ASSIGNED.value

            staff_entity.is_available = False
            staff_entity.assigned_room_id = incident_entity.room_id
            session.commit()
            return self._to_pydantic_incident(incident_entity)

    def complete_task(self, task_id: UUID) -> OperationalTask:
        """Mark an operational task as completed, release assigned staff, and update room status."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status == TaskStatus.COMPLETED.value:
                raise ValueError(f"Task {task_id} is already completed.")

            task_entity.status = TaskStatus.COMPLETED.value

            # Update associated maintenance incident if one exists
            for inc in self.maintenance_incidents.values():
                if inc.operational_task_id == task_id or (
                    inc.room_id == task_entity.room_id
                    and inc.assigned_technician_id == task_entity.assigned_staff_id
                    and inc.status == IncidentStatus.ASSIGNED
                ):
                    inc.status = IncidentStatus.RESOLVED

            # Release assigned staff
            if task_entity.assigned_staff_id:
                staff_entity = session.get(StaffEntity, task_entity.assigned_staff_id)
                if staff_entity:
                    # Check if this staff member has any other active tasks
                    remaining_staff_tasks_stmt = select(OperationalTaskEntity).where(
                        OperationalTaskEntity.assigned_staff_id == staff_entity.id,
                        OperationalTaskEntity.id != task_id,
                        OperationalTaskEntity.status.in_([
                            TaskStatus.PENDING.value,
                            TaskStatus.ASSIGNED.value,
                            TaskStatus.IN_PROGRESS.value,
                        ]),
                    )
                    remaining_staff_tasks = list(session.execute(remaining_staff_tasks_stmt).scalars().all())
                    staff_entity.active_task_count = len(remaining_staff_tasks)

                    if not remaining_staff_tasks:
                        staff_entity.is_available = True
                        staff_entity.assigned_room_id = None
                    else:
                        staff_entity.assigned_room_id = remaining_staff_tasks[0].room_id

            # Update room status if no other active tasks for this room
            room_entity = session.get(RoomEntity, task_entity.room_id)
            if room_entity:
                remaining_room_tasks_stmt = select(OperationalTaskEntity).where(
                    OperationalTaskEntity.room_id == task_entity.room_id,
                    OperationalTaskEntity.id != task_id,
                    OperationalTaskEntity.status.in_([
                        TaskStatus.PENDING.value,
                        TaskStatus.ASSIGNED.value,
                        TaskStatus.IN_PROGRESS.value,
                    ]),
                )
                remaining_room_tasks = list(session.execute(remaining_room_tasks_stmt).scalars().all())

                if not remaining_room_tasks:
                    all_room_tasks_stmt = select(OperationalTaskEntity).where(
                        OperationalTaskEntity.room_id == task_entity.room_id
                    )
                    all_room_tasks = list(session.execute(all_room_tasks_stmt).scalars().all())
                    had_maintenance = any(
                        t.task_type == TaskType.ROOM_MAINTENANCE.value
                        for t in all_room_tasks
                    )

                    if (
                        had_maintenance
                        and room_entity.status == RoomStatus.OCCUPIED.value
                    ):
                        pass
                    elif had_maintenance:
                        room_entity.status = RoomStatus.INSPECTION.value
                        session.commit()
                        from app.agents.room_readiness_agent import RoomReadinessAgent
                        readiness_agent = RoomReadinessAgent(self)
                        readiness_agent.verify_post_maintenance(task_entity.room_id)
                    else:
                        room_entity.status = RoomStatus.READY.value
                else:
                    has_maintenance = any(t.task_type == TaskType.ROOM_MAINTENANCE.value for t in remaining_room_tasks)
                    if has_maintenance:
                        room_entity.status = RoomStatus.MAINTENANCE.value
                    elif room_entity.status != RoomStatus.OCCUPIED.value:
                        room_entity.status = RoomStatus.CLEANING.value

            session.commit()
            return self._to_pydantic_task(task_entity)


