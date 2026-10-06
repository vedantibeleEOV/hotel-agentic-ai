import sys
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from uuid import UUID
from zoneinfo import ZoneInfo

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import func, or_, select

from app.config import settings
from app.database.connection import SessionLocal
from app.database.orm import (
    GuestEntity,
    MaintenanceIncidentEntity,
    OperationalTaskEntity,
    ReservationEntity,
    RoomEntity,
    StaffEntity,
    TaskActivityEntity,
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

# ASSUMPTION: Standard estimated cleaning durations in minutes by room type.
# DELUXE = 45, STANDARD = 30, SUITE = 50. Fallback = 30.
DEFAULT_CLEANING_MINUTES_BY_ROOM_TYPE = {
    "DELUXE": 45,
    "STANDARD": 30,
    "SUITE": 50,
}
DEFAULT_CLEANING_MINUTES_FALLBACK = 30


class PostgresHotelRepository:
    """PostgreSQL implementation of hotel data repository for READ and WRITE operations using SQLAlchemy 2.x."""


    def __init__(self, session_factory=SessionLocal):
        self.session_factory = session_factory

    @staticmethod
    def _to_pydantic_incident(entity: MaintenanceIncidentEntity) -> MaintenanceIncident:
        created_dt = entity.created_at
        if created_dt and created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
        return MaintenanceIncident(
            id=entity.id,
            room_id=entity.room_id,
            reported_by_staff_id=entity.reported_by_staff_id,
            description=entity.description,
            category=MaintenanceCategory(entity.category),
            severity=MaintenanceSeverity(entity.severity),
            affects_room_readiness=entity.affects_room_readiness,
            status=IncidentStatus(entity.status),
            assigned_technician_id=entity.assigned_technician_id,
            sla_minutes=entity.sla_minutes,
            created_at=created_dt,
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
        created_dt = entity.created_at
        if created_dt and created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
        started_dt = entity.started_at
        if started_dt and started_dt.tzinfo is None:
            started_dt = started_dt.replace(tzinfo=timezone.utc)
        return OperationalTask(
            id=entity.id,
            room_id=entity.room_id,
            task_type=TaskType(entity.task_type),
            priority_score=entity.priority_score,
            priority_level=entity.priority_level,
            status=TaskStatus(entity.status),
            assigned_staff_id=entity.assigned_staff_id,
            created_at=created_dt,
            started_at=started_dt,
            notes=entity.notes,
        )

    def get_rooms(
        self,
        floor: Optional[int] = None,
        status: Optional[Union[str, RoomStatus]] = None,
        room_type: Optional[str] = None,
    ) -> List[Room]:
        """Read rooms with optional filtering by floor, status, room_type, sorted by room_number."""
        with self.session_factory() as session:
            stmt = select(RoomEntity)
            if floor is not None:
                stmt = stmt.where(RoomEntity.floor == floor)
            if status is not None:
                status_val = status.value if hasattr(status, "value") else str(status)
                stmt = stmt.where(RoomEntity.status == status_val.upper())
            if room_type is not None:
                stmt = stmt.where(RoomEntity.room_type == room_type.upper())
            stmt = stmt.order_by(RoomEntity.room_number.asc())
            entities = session.execute(stmt).scalars().all()
            return [self._to_pydantic_room(e) for e in entities]

    def get_rooms_summary(self) -> dict:
        """Calculate total, status counts, and floor counts using SQL aggregation."""
        with self.session_factory() as session:
            total = session.scalar(select(func.count(RoomEntity.id))) or 0

            # Real SQL GROUP BY query for status
            status_stmt = select(RoomEntity.status, func.count(RoomEntity.id)).group_by(RoomEntity.status)
            status_rows = session.execute(status_stmt).all()
            by_status = {s.value: 0 for s in RoomStatus}
            for st, cnt in status_rows:
                if st:
                    by_status[st] = cnt

            # Real SQL GROUP BY query for floor
            floor_stmt = (
                select(RoomEntity.floor, func.count(RoomEntity.id))
                .group_by(RoomEntity.floor)
                .order_by(RoomEntity.floor.asc())
            )
            floor_rows = session.execute(floor_stmt).all()
            by_floor = {str(fl): cnt for fl, cnt in floor_rows if fl is not None}

            # Real SQL GROUP BY query for floor and status
            floor_status_stmt = (
                select(RoomEntity.floor, RoomEntity.status, func.count(RoomEntity.id))
                .group_by(RoomEntity.floor, RoomEntity.status)
                .order_by(RoomEntity.floor.asc())
            )
            floor_status_rows = session.execute(floor_status_stmt).all()

            by_floor_status = {
                fl_key: {s.value: 0 for s in RoomStatus}
                for fl_key in by_floor.keys()
            }
            for fl, st, cnt in floor_status_rows:
                if fl is not None and st is not None:
                    fl_key = str(fl)
                    if fl_key not in by_floor_status:
                        by_floor_status[fl_key] = {s.value: 0 for s in RoomStatus}
                    by_floor_status[fl_key][st] = cnt

            return {
                "total": total,
                "by_status": by_status,
                "by_floor": by_floor,
                "by_floor_status": by_floor_status,
            }

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

    def get_tasks_detailed(
        self,
        task_type: Optional[str] = None,
        status_group: Optional[str] = "open",
        status: Optional[str] = None,
        priority: Optional[str] = None,
        floor: Optional[int] = None,
        staff_id: Optional[int] = None,
        room_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[dict]:
        """Retrieve rich tasks using SQL joins, window function for display_id, and flexible filtering."""
        with self.session_factory() as session:
            # Subquery for deterministic display_id based on creation order per task type
            seq_subq = (
                select(
                    OperationalTaskEntity.id.label("task_id"),
                    func.row_number()
                    .over(
                        partition_by=OperationalTaskEntity.task_type,
                        order_by=[
                            OperationalTaskEntity.created_at.asc(),
                            OperationalTaskEntity.id.asc(),
                        ],
                    )
                    .label("seq_num"),
                )
            ).subquery()

            stmt = (
                select(
                    OperationalTaskEntity,
                    seq_subq.c.seq_num,
                    RoomEntity.room_number,
                    RoomEntity.floor,
                    StaffEntity.id.label("staff_id"),
                    StaffEntity.name.label("staff_name"),
                    MaintenanceIncidentEntity.description.label("incident_description"),
                    MaintenanceIncidentEntity.category.label("incident_category"),
                    MaintenanceIncidentEntity.severity.label("incident_severity"),
                    MaintenanceIncidentEntity.sla_minutes.label("incident_sla_minutes"),
                    MaintenanceIncidentEntity.created_at.label("incident_created_at"),
                )
                .join(seq_subq, OperationalTaskEntity.id == seq_subq.c.task_id)
                .outerjoin(RoomEntity, OperationalTaskEntity.room_id == RoomEntity.id)
                .outerjoin(StaffEntity, OperationalTaskEntity.assigned_staff_id == StaffEntity.id)
                .outerjoin(
                    MaintenanceIncidentEntity,
                    OperationalTaskEntity.id == MaintenanceIncidentEntity.operational_task_id,
                )
            )

            # 1. Filter by task_type (cleaning / maintenance)
            if task_type:
                t_lower = task_type.lower()
                if "clean" in t_lower:
                    stmt = stmt.where(OperationalTaskEntity.task_type == TaskType.ROOM_CLEANING.value)
                elif "maint" in t_lower:
                    stmt = stmt.where(OperationalTaskEntity.task_type == TaskType.ROOM_MAINTENANCE.value)
                else:
                    stmt = stmt.where(OperationalTaskEntity.task_type == task_type.upper())

            # 2. Filter by status / status_group
            if status:
                stmt = stmt.where(OperationalTaskEntity.status == status.upper())
            elif status_group:
                sg_lower = status_group.lower()
                if sg_lower == "open":
                    stmt = stmt.where(
                        OperationalTaskEntity.status.in_([
                            TaskStatus.PENDING.value,
                            TaskStatus.ASSIGNED.value,
                            TaskStatus.IN_PROGRESS.value,
                            TaskStatus.ON_HOLD.value,
                        ])
                    )
                elif sg_lower == "completed":
                    stmt = stmt.where(
                        OperationalTaskEntity.status.in_([
                            TaskStatus.COMPLETED.value,
                            TaskStatus.FAILED.value,
                        ])
                    )
                # if sg_lower == "all", no status group filter applied

            # 3. Filter by priority
            if priority:
                p_upper = priority.upper()
                p_map = {
                    "CRITICAL": "URGENT",
                    "URGENT": "URGENT",
                    "HIGH": "HIGH",
                    "MEDIUM": "STANDARD",
                    "STANDARD": "STANDARD",
                    "LOW": "NORMAL",
                    "NORMAL": "NORMAL",
                }
                mapped_p = p_map.get(p_upper, p_upper)
                stmt = stmt.where(
                    or_(
                        OperationalTaskEntity.priority_level == p_upper,
                        OperationalTaskEntity.priority_level == mapped_p,
                    )
                )

            # 4. Filter by floor
            if floor is not None:
                stmt = stmt.where(RoomEntity.floor == floor)

            # 5. Filter by staff_id
            if staff_id is not None:
                stmt = stmt.where(OperationalTaskEntity.assigned_staff_id == staff_id)

            # 6. Filter by room_id
            if room_id is not None:
                stmt = stmt.where(OperationalTaskEntity.room_id == room_id)

            # 7. Filter by search query
            if search:
                term = f"%{search.strip()}%"
                stmt = stmt.where(
                    or_(
                        RoomEntity.room_number.ilike(term),
                        OperationalTaskEntity.notes.ilike(term),
                        MaintenanceIncidentEntity.description.ilike(term),
                        StaffEntity.name.ilike(term),
                    )
                )

            # 8. Sort: priority_score descending, created_at ascending
            stmt = stmt.order_by(
                OperationalTaskEntity.priority_score.desc(),
                OperationalTaskEntity.created_at.asc(),
            )

            rows = session.execute(stmt).all()

            results = []
            for row in rows:
                task = row[0]
                seq_num = row[1] or 1
                room_num = row[2]
                r_floor = row[3]
                st_id = row[4]
                st_name = row[5]
                inc_desc = row[6]
                inc_cat = row[7]
                inc_sev = row[8]
                inc_sla = row[9]
                inc_created = row[10]

                is_cleaning = (
                    task.task_type == TaskType.ROOM_CLEANING.value
                    or "CLEAN" in str(task.task_type).upper()
                )
                prefix = "HK" if is_cleaning else "MT"
                display_id = f"{prefix}-{seq_num:04d}"

                # Priority label
                p_level = str(task.priority_level).upper()
                priority_label_map = {
                    "URGENT": "Critical",
                    "CRITICAL": "Critical",
                    "HIGH": "High",
                    "STANDARD": "Medium",
                    "MEDIUM": "Medium",
                    "NORMAL": "Low",
                    "LOW": "Low",
                }
                priority_label = priority_label_map.get(p_level, task.priority_level)

                # Status label
                st_val = str(task.status).upper()
                if st_val == "IN_PROGRESS":
                    status_label = "Cleaning" if is_cleaning else "In repair"
                elif st_val == "PENDING":
                    status_label = "Pending"
                elif st_val == "ASSIGNED":
                    status_label = "Assigned"
                elif st_val == "ON_HOLD":
                    status_label = "On hold"
                elif st_val == "COMPLETED":
                    status_label = "Completed"
                elif st_val == "FAILED":
                    status_label = "Failed"
                else:
                    status_label = st_val.capitalize()

                # Description
                if is_cleaning:
                    description = task.notes or "Room cleaning"
                else:
                    description = inc_desc or task.notes or "Maintenance repair"

                # Created at with timezone
                created_dt = task.created_at
                if created_dt and created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                created_at_iso = created_dt.isoformat() if created_dt else None

                # SLA minutes & deadline for maintenance
                sla_minutes = None
                sla_deadline_iso = None
                if not is_cleaning and inc_sla:
                    sla_minutes = inc_sla
                    base_time = inc_created or task.created_at
                    if base_time:
                        if base_time.tzinfo is None:
                            base_time = base_time.replace(tzinfo=timezone.utc)
                        deadline_dt = base_time + timedelta(minutes=inc_sla)
                        sla_deadline_iso = deadline_dt.isoformat()

                task_dict = {
                    "id": task.id,
                    "display_id": display_id,
                    "task_type": task.task_type,
                    "type_label": "Cleaning" if is_cleaning else "Maintenance",
                    "description": description,
                    "room_id": task.room_id,
                    "room_number": room_num or str(task.room_id),
                    "floor": r_floor if r_floor is not None else 1,
                    "assigned_staff": {"id": st_id, "name": st_name} if st_id else None,
                    "assigned_staff_id": st_id,
                    "priority_score": task.priority_score,
                    "priority_level": task.priority_level,
                    "priority_label": priority_label,
                    "status": task.status,
                    "status_label": status_label,
                    "created_at": created_at_iso,
                    "sla_minutes": sla_minutes,
                    "sla_deadline": sla_deadline_iso,
                    "incident_category": inc_cat if not is_cleaning else None,
                    "incident_severity": inc_sev if not is_cleaning else None,
                    "notes": task.notes,
                }
                results.append(task_dict)

            # If search string matches display_id or other fields, refine search
            if search:
                s_upper = search.strip().upper()
                results = [
                    r
                    for r in results
                    if s_upper in r["display_id"].upper()
                    or s_upper in str(r["room_number"]).upper()
                    or s_upper in str(r["description"]).upper()
                    or (r["assigned_staff"] and s_upper in r["assigned_staff"]["name"].upper())
                ]

            return results

    def get_tasks_summary(self) -> dict:
        """Calculate open count, assigned count, counts by type and by priority using real SQL queries."""
        with self.session_factory() as session:
            total = session.scalar(select(func.count(OperationalTaskEntity.id))) or 0

            # Open count: PENDING, ASSIGNED, IN_PROGRESS, ON_HOLD
            open_count = session.scalar(
                select(func.count(OperationalTaskEntity.id)).where(
                    OperationalTaskEntity.status.in_([
                        TaskStatus.PENDING.value,
                        TaskStatus.ASSIGNED.value,
                        TaskStatus.IN_PROGRESS.value,
                        TaskStatus.ON_HOLD.value,
                    ])
                )
            ) or 0

            # Assigned count: ASSIGNED tasks or open tasks with assigned staff
            assigned_count = session.scalar(
                select(func.count(OperationalTaskEntity.id)).where(
                    OperationalTaskEntity.assigned_staff_id.isnot(None),
                    OperationalTaskEntity.status.in_([
                        TaskStatus.ASSIGNED.value,
                        TaskStatus.IN_PROGRESS.value,
                        TaskStatus.ON_HOLD.value,
                        TaskStatus.PENDING.value,
                    ]),
                )
            ) or 0

            # By type
            type_rows = session.execute(
                select(OperationalTaskEntity.task_type, func.count(OperationalTaskEntity.id))
                .group_by(OperationalTaskEntity.task_type)
            ).all()
            by_type = {"cleaning": 0, "maintenance": 0}
            for t_val, cnt in type_rows:
                if t_val:
                    if "CLEAN" in str(t_val).upper():
                        by_type["cleaning"] += cnt
                    elif "MAINT" in str(t_val).upper():
                        by_type["maintenance"] += cnt

            # By priority
            priority_rows = session.execute(
                select(OperationalTaskEntity.priority_level, func.count(OperationalTaskEntity.id))
                .group_by(OperationalTaskEntity.priority_level)
            ).all()
            by_priority = {
                "urgent": 0,
                "high": 0,
                "standard": 0,
                "normal": 0,
            }
            for p_val, cnt in priority_rows:
                if p_val:
                    p_up = str(p_val).upper()
                    if p_up in ("URGENT", "CRITICAL"):
                        by_priority["urgent"] += cnt
                    elif p_up == "HIGH":
                        by_priority["high"] += cnt
                    elif p_up in ("STANDARD", "MEDIUM"):
                        by_priority["standard"] += cnt
                    elif p_up in ("NORMAL", "LOW"):
                        by_priority["normal"] += cnt

            # By status
            status_rows = session.execute(
                select(OperationalTaskEntity.status, func.count(OperationalTaskEntity.id))
                .group_by(OperationalTaskEntity.status)
            ).all()
            by_status = {s.value: 0 for s in TaskStatus}
            for st_val, cnt in status_rows:
                if st_val and st_val in by_status:
                    by_status[st_val] = cnt

            return {
                "total": total,
                "open_count": open_count,
                "assigned_count": assigned_count,
                "by_type": by_type,
                "by_priority": by_priority,
                "by_status": by_status,
            }

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
        """Save or update an operational task in PostgreSQL database."""
        status_val = task.status.value if hasattr(task.status, "value") else str(task.status)
        type_val = task.task_type.value if hasattr(task.task_type, "value") else str(task.task_type)
        with self.session_factory() as session:
            existing = session.get(OperationalTaskEntity, task.id)
            if existing:
                existing.room_id = task.room_id
                existing.task_type = type_val
                existing.priority_score = task.priority_score
                existing.priority_level = task.priority_level
                existing.status = status_val
                existing.assigned_staff_id = task.assigned_staff_id
                if task.started_at is not None:
                    s_at = task.started_at
                    if s_at.tzinfo is None:
                        s_at = s_at.replace(tzinfo=timezone.utc)
                    existing.started_at = s_at
                existing.notes = task.notes
            else:
                c_at = task.created_at or datetime.now(timezone.utc)
                if c_at.tzinfo is None:
                    c_at = c_at.replace(tzinfo=timezone.utc)
                s_at = task.started_at
                if s_at and s_at.tzinfo is None:
                    s_at = s_at.replace(tzinfo=timezone.utc)
                task_entity = OperationalTaskEntity(
                    id=task.id,
                    room_id=task.room_id,
                    task_type=type_val,
                    priority_score=task.priority_score,
                    priority_level=task.priority_level,
                    status=status_val,
                    assigned_staff_id=task.assigned_staff_id,
                    created_at=c_at,
                    started_at=s_at,
                    notes=task.notes,
                )
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
                existing.affects_room_readiness = incident.affects_room_readiness
                existing.status = status_val
                existing.assigned_technician_id = incident.assigned_technician_id
                existing.sla_minutes = incident.sla_minutes
                existing.operational_task_id = incident.operational_task_id
            else:
                inc_c_at = incident.created_at or datetime.now(timezone.utc)
                if inc_c_at.tzinfo is None:
                    inc_c_at = inc_c_at.replace(tzinfo=timezone.utc)
                incident_entity = MaintenanceIncidentEntity(
                    id=incident.id,
                    room_id=incident.room_id,
                    reported_by_staff_id=incident.reported_by_staff_id,
                    description=incident.description,
                    category=cat_val,
                    severity=sev_val,
                    affects_room_readiness=incident.affects_room_readiness,
                    status=status_val,
                    assigned_technician_id=incident.assigned_technician_id,
                    sla_minutes=incident.sla_minutes,
                    created_at=inc_c_at,
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

    def complete_task(
        self,
        task_id: UUID,
        actor_name: str = settings.CURRENT_USER_NAME,
        actor_role: str = settings.CURRENT_USER_ROLE,
    ) -> OperationalTask:
        """Mark an operational task as completed, release assigned staff, and update room status."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status == TaskStatus.COMPLETED.value:
                raise ValueError(f"Task {task_id} is already completed.")
            if task_entity.status == TaskStatus.CANCELLED.value:
                raise ValueError(f"Cannot complete cancelled task {task_id}.")

            task_entity.status = TaskStatus.COMPLETED.value

            # Update associated maintenance incident if one exists
            inc_stmt = select(MaintenanceIncidentEntity).where(
                or_(
                    MaintenanceIncidentEntity.operational_task_id == task_id,
                    (
                        MaintenanceIncidentEntity.room_id == task_entity.room_id
                        and MaintenanceIncidentEntity.assigned_technician_id == task_entity.assigned_staff_id
                        and MaintenanceIncidentEntity.status == IncidentStatus.ASSIGNED.value
                    ),
                )
            )
            incidents = session.execute(inc_stmt).scalars().all()
            for inc in incidents:
                inc.status = IncidentStatus.RESOLVED.value

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

            # Update room status and orchestrate next steps based on task type
            is_cleaning = (
                task_entity.task_type == TaskType.ROOM_CLEANING.value
                or "CLEAN" in str(task_entity.task_type).upper()
            )
            room_entity = session.get(RoomEntity, task_entity.room_id)
            if room_entity:
                task_type_val = task_entity.task_type

                if task_type_val == TaskType.ROOM_MAINTENANCE.value:
                    if room_entity.status != RoomStatus.OCCUPIED.value:
                        remaining_maint_stmt = select(OperationalTaskEntity).where(
                            OperationalTaskEntity.room_id == task_entity.room_id,
                            OperationalTaskEntity.id != task_id,
                            OperationalTaskEntity.task_type == TaskType.ROOM_MAINTENANCE.value,
                            OperationalTaskEntity.status.in_([
                                TaskStatus.PENDING.value,
                                TaskStatus.ASSIGNED.value,
                                TaskStatus.IN_PROGRESS.value,
                                TaskStatus.ON_HOLD.value,
                            ]),
                        )
                        remaining_maint = list(session.execute(remaining_maint_stmt).scalars().all())
                        if remaining_maint:
                            room_entity.status = RoomStatus.MAINTENANCE.value
                        else:
                            # Check on-hold housekeeping tasks
                            on_hold_tasks_stmt = select(OperationalTaskEntity).where(
                                OperationalTaskEntity.room_id == task_entity.room_id,
                                OperationalTaskEntity.task_type == TaskType.ROOM_CLEANING.value,
                                OperationalTaskEntity.status == TaskStatus.ON_HOLD.value,
                            )
                            on_hold_tasks = list(session.execute(on_hold_tasks_stmt).scalars().all())
                            for oh_t in on_hold_tasks:
                                oh_t.status = TaskStatus.ASSIGNED.value
                            if on_hold_tasks:
                                room_entity.status = RoomStatus.CLEANING.value
                            else:
                                room_entity.status = RoomStatus.READY.value
                elif task_type_val == TaskType.ROOM_CLEANING.value:
                    remaining_room_tasks_stmt = select(OperationalTaskEntity).where(
                        OperationalTaskEntity.room_id == task_entity.room_id,
                        OperationalTaskEntity.id != task_id,
                        OperationalTaskEntity.status.in_([
                            TaskStatus.PENDING.value,
                            TaskStatus.ASSIGNED.value,
                            TaskStatus.IN_PROGRESS.value,
                            TaskStatus.ON_HOLD.value,
                        ]),
                    )
                    remaining_room_tasks = list(session.execute(remaining_room_tasks_stmt).scalars().all())

                    if not remaining_room_tasks:
                        room_entity.status = RoomStatus.READY.value
                    else:
                        has_maintenance = any(t.task_type == TaskType.ROOM_MAINTENANCE.value for t in remaining_room_tasks)
                        if has_maintenance:
                            room_entity.status = RoomStatus.MAINTENANCE.value
                        elif room_entity.status != RoomStatus.OCCUPIED.value:
                            room_entity.status = RoomStatus.CLEANING.value
                else:
                    remaining_room_tasks_stmt = select(OperationalTaskEntity).where(
                        OperationalTaskEntity.room_id == task_entity.room_id,
                        OperationalTaskEntity.id != task_id,
                        OperationalTaskEntity.status.in_([
                            TaskStatus.PENDING.value,
                            TaskStatus.ASSIGNED.value,
                            TaskStatus.IN_PROGRESS.value,
                            TaskStatus.ON_HOLD.value,
                        ]),
                    )
                    remaining_room_tasks = list(session.execute(remaining_room_tasks_stmt).scalars().all())
                    if not remaining_room_tasks:
                        room_entity.status = RoomStatus.READY.value

            # Log activity event
            act_event = TaskActivityEntity(
                task_id=task_id,
                room_id=task_entity.room_id,
                timestamp=datetime.now(timezone.utc),
                event_type="TASK_COMPLETED",
                title="Task completed",
                actor_name=actor_name,
                actor_role=actor_role,
                action=f"Completed by {actor_name}",
                outcome="Repair completed" if not is_cleaning else "Room READY",
            )
            session.add(act_event)

            session.commit()
            return self._to_pydantic_task(task_entity)

    def get_housekeeping_board(self, floor: Optional[int] = None) -> Dict[str, Any]:
        """Generate housekeeping board data matching the Operations prototype."""
        now_utc = datetime.now(timezone.utc)
        tz_hotel = ZoneInfo("Asia/Kolkata")
        now_local = datetime.now(tz_hotel)
        start_of_today_local = datetime.combine(now_local.date(), time.min, tzinfo=tz_hotel)
        start_of_today_utc = start_of_today_local.astimezone(timezone.utc)

        with self.session_factory() as session:
            # 1. Fetch all rooms
            all_rooms = session.execute(select(RoomEntity)).scalars().all()
            all_rooms_by_id = {r.id: r for r in all_rooms}

            # Filter rooms by floor if specified
            if floor is not None:
                filtered_rooms = [r for r in all_rooms if r.floor == floor]
            else:
                filtered_rooms = all_rooms
            filtered_room_ids = {r.id for r in filtered_rooms}

            # 2. Fetch all staff to map staff IDs to names/details
            all_staff_entities = session.execute(select(StaffEntity)).scalars().all()
            staff_by_id = {s.id: s for s in all_staff_entities}

            # Housekeeping staff
            hk_staff_list = [
                s for s in all_staff_entities
                if s.role and ("HOUSEKEEP" in s.role.upper() or "CLEAN" in s.role.upper())
            ]
            hk_staff_list.sort(key=lambda s: (s.assigned_floor or 0, s.name))

            # 3. Create deterministic display IDs for all cleaning tasks
            all_cleaning_tasks_stmt = (
                select(OperationalTaskEntity)
                .where(OperationalTaskEntity.task_type == TaskType.ROOM_CLEANING.value)
                .order_by(OperationalTaskEntity.created_at.asc(), OperationalTaskEntity.id.asc())
            )
            all_cleaning_tasks = list(session.execute(all_cleaning_tasks_stmt).scalars().all())
            display_id_map = {
                t.id: f"HK-{idx + 1:04d}" for idx, t in enumerate(all_cleaning_tasks)
            }

            # 4. Fetch upcoming reservations with guests
            reservations_stmt = (
                select(ReservationEntity, GuestEntity)
                .join(GuestEntity, ReservationEntity.guest_id == GuestEntity.id)
                .where(ReservationEntity.check_out_time >= now_utc - timedelta(days=1))
                .order_by(ReservationEntity.check_in_time.asc())
            )
            res_rows = session.execute(reservations_stmt).all()

            # Map room_id -> next reservation / guest info
            room_next_guest_map: Dict[int, Dict[str, Any]] = {}
            for res_ent, guest_ent in res_rows:
                r_id = res_ent.room_id
                if r_id in room_next_guest_map:
                    continue  # already stored the earliest upcoming reservation

                check_in_dt = res_ent.check_in_time
                if check_in_dt and check_in_dt.tzinfo is None:
                    check_in_dt = check_in_dt.replace(tzinfo=timezone.utc)

                is_vip = bool(guest_ent.guest_type and "VIP" in guest_ent.guest_type.upper())
                diff_sec = (check_in_dt - now_utc).total_seconds() if check_in_dt else 0
                diff_min = int(diff_sec / 60)

                if diff_min > 0:
                    if diff_min < 60:
                        arrival_label = f"arriving in {diff_min}m"
                    else:
                        hours = diff_min // 60
                        mins = diff_min % 60
                        arrival_label = f"arriving in {hours}h {mins}m" if mins > 0 else f"arriving in {hours}h"
                else:
                    arrival_label = "arrived / in-house"

                # Priority reason label (for VIP or arriving within 2h = 7200s)
                arriving_soon = (0 <= diff_sec <= 7200)
                if is_vip and arriving_soon:
                    priority_reason = f"VIP · {arrival_label}"
                elif is_vip:
                    priority_reason = "VIP"
                elif arriving_soon:
                    priority_reason = arrival_label
                else:
                    priority_reason = None

                room_next_guest_map[r_id] = {
                    "guest_name": f"{guest_ent.first_name} {guest_ent.last_name}".strip(),
                    "is_vip": is_vip,
                    "check_in_time": check_in_dt.isoformat() if check_in_dt else None,
                    "arrival_label": arrival_label,
                    "arriving_soon": arriving_soon,
                    "priority_reason": priority_reason,
                }

            # 5. Fetch maintenance incidents for blocked reasons
            maint_incidents = session.execute(
                select(MaintenanceIncidentEntity).where(
                    MaintenanceIncidentEntity.status.in_([
                        IncidentStatus.OPEN.value,
                        IncidentStatus.ASSIGNED.value,
                    ])
                )
            ).scalars().all()
            maint_by_room: Dict[int, MaintenanceIncidentEntity] = {
                inc.room_id: inc for inc in maint_incidents
            }

            # 6. Attendants list calculation
            # Calculate open tasks and availability for each housekeeping staff member
            open_cleaning_tasks = [
                t for t in all_cleaning_tasks
                if t.status in (
                    TaskStatus.PENDING.value,
                    TaskStatus.ASSIGNED.value,
                    TaskStatus.IN_PROGRESS.value,
                    TaskStatus.ON_HOLD.value,
                )
            ]

            attendants_data = []
            available_cleaners_count = 0
            busy_cleaners_count = 0
            off_cleaners_count = 0

            for st in hk_staff_list:
                st_assigned_tasks = [t for t in open_cleaning_tasks if t.assigned_staff_id == st.id]
                open_cnt = len(st_assigned_tasks)
                in_prog_task = next((t for t in st_assigned_tasks if t.status == TaskStatus.IN_PROGRESS.value), None)

                if in_prog_task:
                    avail_status = "busy"
                    busy_cleaners_count += 1
                    in_prog_room = all_rooms_by_id.get(in_prog_task.room_id)
                    room_str = in_prog_room.room_number if in_prog_room else str(in_prog_task.room_id)
                    current_task_str = f"Cleaning {room_str}"
                elif not st.is_available and open_cnt == 0:
                    avail_status = "off"
                    off_cleaners_count += 1
                    current_task_str = f"Floor {st.assigned_floor}" if st.assigned_floor else "Offline"
                else:
                    avail_status = "available"
                    available_cleaners_count += 1
                    current_task_str = f"Floor {st.assigned_floor}" if st.assigned_floor else "Available"

                attendants_data.append({
                    "id": st.id,
                    "name": st.name,
                    "floor": st.assigned_floor,
                    "open_task_count": open_cnt,
                    "availability": avail_status,
                    "current_task": current_task_str,
                })

            # 7. Generate cards for each column
            columns_cards: Dict[str, List[Dict[str, Any]]] = {
                "unassigned": [],
                "assigned": [],
                "cleaning": [],
                "inspection_required": [],
                "completed": [],
                "blocked": [],
            }

            overdue_active_rooms = set()
            priority_active_rooms = []

            for t in all_cleaning_tasks:
                if t.room_id not in filtered_room_ids:
                    continue

                room = all_rooms_by_id.get(t.room_id)
                room_type_str = room.room_type if room else "STANDARD"
                expected_mins = DEFAULT_CLEANING_MINUTES_BY_ROOM_TYPE.get(
                    (room_type_str or "").upper(), DEFAULT_CLEANING_MINUTES_FALLBACK
                )

                created_dt = t.created_at
                if created_dt and created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                created_iso = created_dt.isoformat() if created_dt else None

                started_dt = created_dt if t.status in (TaskStatus.IN_PROGRESS.value, TaskStatus.COMPLETED.value) else None
                started_iso = started_dt.isoformat() if started_dt else None

                due_dt = (started_dt or created_dt) + timedelta(minutes=expected_mins) if (started_dt or t.status in (TaskStatus.ASSIGNED.value, TaskStatus.IN_PROGRESS.value)) else None
                due_iso = due_dt.isoformat() if due_dt else None

                elapsed_minutes = max(0, int((now_utc - (started_dt or created_dt)).total_seconds() / 60)) if (started_dt or created_dt) else None

                is_active = t.status in (
                    TaskStatus.PENDING.value,
                    TaskStatus.ASSIGNED.value,
                    TaskStatus.IN_PROGRESS.value,
                    TaskStatus.ON_HOLD.value,
                )
                is_overdue = bool(is_active and due_dt and now_utc > due_dt)

                if is_active and is_overdue and room:
                    overdue_active_rooms.add(room.room_number)

                next_g = room_next_guest_map.get(t.room_id)
                is_vip_room = bool(next_g and next_g["is_vip"])

                if is_active and next_g and next_g["priority_reason"] and room:
                    priority_active_rooms.append({
                        "room_number": room.room_number,
                        "reason": next_g["priority_reason"],
                    })

                p_level = t.priority_level or "STANDARD"
                p_label = {
                    "URGENT": "Critical",
                    "HIGH": "High",
                    "STANDARD": "Medium",
                    "NORMAL": "Low",
                }.get(p_level.upper(), p_level.title())

                staff_obj = staff_by_id.get(t.assigned_staff_id) if t.assigned_staff_id else None
                assigned_staff_dict = {"id": staff_obj.id, "name": staff_obj.name} if staff_obj else None

                blocked_msg = None
                if t.status == TaskStatus.ON_HOLD.value:
                    m_inc = maint_by_room.get(t.room_id)
                    if m_inc:
                        blocked_msg = f"Maintenance: {m_inc.description}"
                    else:
                        blocked_msg = "Needs a person"

                card = {
                    "id": str(t.id),
                    "display_id": display_id_map.get(t.id, f"HK-{t.room_id:04d}"),
                    "room_number": room.room_number if room else str(t.room_id),
                    "floor": room.floor if room else 1,
                    "room_type": room_type_str,
                    "priority_label": p_label,
                    "priority_level": p_level,
                    "is_vip": is_vip_room,
                    "next_guest": {
                        "name": next_g["guest_name"],
                        "arrival_time": next_g["check_in_time"],
                        "label": next_g["arrival_label"],
                        "is_vip": next_g["is_vip"],
                    } if next_g else None,
                    "description": t.notes or f"{room_type_str.title() if room_type_str else 'Standard'} room cleaning",
                    "assigned_staff": assigned_staff_dict,
                    "ai_assigned": True,
                    "expected_minutes": expected_mins,
                    "started_at": started_iso,
                    "due_at": due_iso,
                    "elapsed_minutes": elapsed_minutes,
                    "is_overdue": is_overdue,
                    "status": t.status,
                    "blocked_reason": blocked_msg,
                    "created_at": created_iso,
                }

                # Place into appropriate column
                if t.status == TaskStatus.ON_HOLD.value:
                    columns_cards["blocked"].append(card)
                elif t.status == TaskStatus.COMPLETED.value:
                    if created_dt and created_dt >= start_of_today_utc:
                        columns_cards["completed"].append(card)
                elif t.status == TaskStatus.IN_PROGRESS.value:
                    columns_cards["cleaning"].append(card)
                elif t.status == TaskStatus.ASSIGNED.value:
                    columns_cards["assigned"].append(card)
                elif t.status == TaskStatus.PENDING.value or card["assigned_staff"] is None:
                    columns_cards["unassigned"].append(card)
                else:
                    columns_cards["unassigned"].append(card)

            # 8. Add inspection cards from rooms in INSPECTION status (Rule 6)
            rooms_in_inspection = [
                r for r in filtered_rooms
                if r.status == RoomStatus.INSPECTION.value
            ]
            for insp_room in rooms_in_inspection:
                already_has_card = any(
                    c["room_number"] == insp_room.room_number
                    for c in columns_cards["inspection_required"]
                )
                if not already_has_card:
                    next_g = room_next_guest_map.get(insp_room.id)
                    is_vip_room = bool(next_g and next_g["is_vip"])
                    exp_mins = DEFAULT_CLEANING_MINUTES_BY_ROOM_TYPE.get(
                        (insp_room.room_type or "").upper(), DEFAULT_CLEANING_MINUTES_FALLBACK
                    )
                    columns_cards["inspection_required"].append({
                        "id": None,
                        "display_id": None,
                        "room_number": insp_room.room_number,
                        "floor": insp_room.floor,
                        "room_type": insp_room.room_type or "STANDARD",
                        "priority_label": "Medium",
                        "priority_level": "STANDARD",
                        "is_vip": is_vip_room,
                        "next_guest": {
                            "name": next_g["guest_name"],
                            "arrival_time": next_g["check_in_time"],
                            "label": next_g["arrival_label"],
                            "is_vip": next_g["is_vip"],
                        } if next_g else None,
                        "description": "Room cleaned · ready for supervisor inspection",
                        "assigned_staff": None,
                        "ai_assigned": False,
                        "expected_minutes": exp_mins,
                        "started_at": None,
                        "due_at": None,
                        "elapsed_minutes": None,
                        "is_overdue": False,
                        "status": "INSPECTION",
                        "blocked_reason": None,
                        "created_at": None,
                    })

            # 9. Sort cards in each column (highest priority first, then oldest created_at)
            priority_weight = {"URGENT": 0, "HIGH": 1, "STANDARD": 2, "NORMAL": 3}
            for col_key in columns_cards:
                columns_cards[col_key].sort(
                    key=lambda c: (
                        priority_weight.get(c.get("priority_level", "NORMAL"), 3),
                        c.get("created_at") or "9999-99-99",
                        str(c.get("room_number", "")),
                    )
                )

            # 10. Columns structure matching prototype exactly
            columns_list = [
                {
                    "key": "unassigned",
                    "title": "Unassigned",
                    "subtitle": "Waiting for an attendant",
                    "count": len(columns_cards["unassigned"]),
                    "cards": columns_cards["unassigned"],
                },
                {
                    "key": "assigned",
                    "title": "Assigned",
                    "subtitle": "Queued with an attendant",
                    "count": len(columns_cards["assigned"]),
                    "cards": columns_cards["assigned"],
                },
                {
                    "key": "cleaning",
                    "title": "Cleaning",
                    "subtitle": "In progress",
                    "count": len(columns_cards["cleaning"]),
                    "cards": columns_cards["cleaning"],
                },
                {
                    "key": "inspection_required",
                    "title": "Inspection Required",
                    "subtitle": "Supervisor check",
                    "count": len(columns_cards["inspection_required"]),
                    "cards": columns_cards["inspection_required"],
                },
                {
                    "key": "completed",
                    "title": "Completed",
                    "subtitle": "Today",
                    "count": len(columns_cards["completed"]),
                    "cards": columns_cards["completed"],
                },
                {
                    "key": "blocked",
                    "title": "Blocked",
                    "subtitle": "Needs a person",
                    "count": len(columns_cards["blocked"]),
                    "cards": columns_cards["blocked"],
                },
            ]

            # 11. Workload summary calculation
            today_tasks = [
                t for t in all_cleaning_tasks
                if t.room_id in filtered_room_ids
                and (
                    (t.created_at and (t.created_at.replace(tzinfo=timezone.utc) if t.created_at.tzinfo is None else t.created_at) >= start_of_today_utc)
                    or t.status in (
                        TaskStatus.PENDING.value,
                        TaskStatus.ASSIGNED.value,
                        TaskStatus.IN_PROGRESS.value,
                        TaskStatus.ON_HOLD.value,
                    )
                )
            ]
            still_open_tasks = [
                t for t in today_tasks
                if t.status in (
                    TaskStatus.PENDING.value,
                    TaskStatus.ASSIGNED.value,
                    TaskStatus.IN_PROGRESS.value,
                    TaskStatus.ON_HOLD.value,
                )
            ]

            summary = {
                "todays_workload": {
                    "total": len(today_tasks),
                    "still_open": len(still_open_tasks),
                },
                "available_cleaners": {
                    "total": len(hk_staff_list),
                    "available": available_cleaners_count,
                    "busy": busy_cleaners_count,
                    "off": off_cleaners_count,
                },
                "in_progress": {
                    "total": len(columns_cards["cleaning"]),
                    "awaiting_inspection": len(columns_cards["inspection_required"]),
                },
                "completed_today": len(columns_cards["completed"]),
                "overdue": {
                    "count": len(overdue_active_rooms),
                    "rooms": sorted(list(overdue_active_rooms)),
                },
                "priority_rooms": {
                    "count": len(priority_active_rooms),
                    "rooms": priority_active_rooms,
                },
            }

            return {
                "summary": summary,
                "columns": columns_list,
                "attendants": attendants_data,
                "generated_at": now_utc.isoformat(),
            }

    def log_activity(
        self,
        task_id: Optional[UUID],
        room_id: Optional[int],
        event_type: str,
        title: str,
        actor_name: str,
        actor_role: str,
        action: Optional[str] = None,
        outcome: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        session=None,
    ) -> TaskActivityEntity:
        """Log a persistent task/room activity event to PostgreSQL."""
        ts = timestamp or datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        act = TaskActivityEntity(
            task_id=task_id,
            room_id=room_id,
            timestamp=ts,
            event_type=event_type,
            title=title,
            actor_name=actor_name,
            actor_role=actor_role,
            action=action,
            outcome=outcome,
        )
        if session is not None:
            session.add(act)
        else:
            with self.session_factory() as sess:
                sess.add(act)
                sess.commit()
        return act

    def get_task_activities(self, task_id: UUID) -> List[dict]:
        """Fetch all activity events for a task (newest first)."""
        with self.session_factory() as session:
            stmt = (
                select(TaskActivityEntity)
                .where(TaskActivityEntity.task_id == task_id)
                .order_by(TaskActivityEntity.timestamp.desc(), TaskActivityEntity.id.desc())
            )
            entities = session.execute(stmt).scalars().all()
            return [
                {
                    "id": str(e.id),
                    "timestamp": (
                        e.timestamp.replace(tzinfo=timezone.utc)
                        if e.timestamp.tzinfo is None
                        else e.timestamp
                    ).isoformat(),
                    "event_type": e.event_type,
                    "title": e.title,
                    "actor_name": e.actor_name,
                    "actor_role": e.actor_role,
                    "action": e.action,
                    "outcome": e.outcome,
                }
                for e in entities
            ]

    def start_task(
        self,
        task_id: UUID,
        actor_name: str = settings.CURRENT_USER_NAME,
        actor_role: str = settings.CURRENT_USER_ROLE,
    ) -> OperationalTask:
        """Start a task, set started_at, update room status, and log activity."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status == TaskStatus.IN_PROGRESS.value:
                raise ValueError(f"Task {task_id} is already in progress.")
            if task_entity.status in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
                raise ValueError(f"Cannot start task {task_id} with status {task_entity.status}.")

            now_utc = datetime.now(timezone.utc)
            task_entity.status = TaskStatus.IN_PROGRESS.value
            task_entity.started_at = now_utc

            is_cleaning = (
                task_entity.task_type == TaskType.ROOM_CLEANING.value
                or "CLEAN" in str(task_entity.task_type).upper()
            )

            # Update room status
            room_entity = session.get(RoomEntity, task_entity.room_id)
            if room_entity:
                if is_cleaning:
                    if room_entity.status != RoomStatus.OCCUPIED.value:
                        room_entity.status = RoomStatus.CLEANING.value
                else:
                    if room_entity.status != RoomStatus.OCCUPIED.value:
                        room_entity.status = RoomStatus.MAINTENANCE.value

            # Update maintenance incident if exists
            if not is_cleaning:
                inc_stmt = select(MaintenanceIncidentEntity).where(
                    MaintenanceIncidentEntity.operational_task_id == task_id
                )
                incidents = session.execute(inc_stmt).scalars().all()
                for inc in incidents:
                    inc.status = IncidentStatus.IN_PROGRESS.value

            # Log activity event
            title = "Cleaning started" if is_cleaning else "Repair started"
            act_event = TaskActivityEntity(
                task_id=task_id,
                room_id=task_entity.room_id,
                timestamp=now_utc,
                event_type="TASK_STARTED",
                title=title,
                actor_name=actor_name,
                actor_role=actor_role,
                action=f"Started by {actor_name}",
                outcome="In progress",
            )
            session.add(act_event)

            session.commit()
            return self._to_pydantic_task(task_entity)

    def block_task(
        self,
        task_id: UUID,
        reason: Optional[str] = None,
        actor_name: str = settings.CURRENT_USER_NAME,
        actor_role: str = settings.CURRENT_USER_ROLE,
    ) -> OperationalTask:
        """Mark a task as blocked (ON_HOLD) with an optional reason."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
                raise ValueError(f"Cannot block task {task_id} with status {task_entity.status}.")
            if task_entity.status == TaskStatus.ON_HOLD.value:
                raise ValueError(f"Task {task_id} is already blocked.")

            task_entity.status = TaskStatus.ON_HOLD.value
            reason_str = reason.strip() if reason and reason.strip() else "Marked blocked"
            if task_entity.notes:
                task_entity.notes = f"{task_entity.notes} | Blocked: {reason_str}"
            else:
                task_entity.notes = f"Blocked: {reason_str}"

            act_event = TaskActivityEntity(
                task_id=task_id,
                room_id=task_entity.room_id,
                timestamp=datetime.now(timezone.utc),
                event_type="TASK_BLOCKED",
                title="Task blocked",
                actor_name=actor_name,
                actor_role=actor_role,
                action=f"Marked BLOCKED by {actor_name}",
                outcome=reason_str,
            )
            session.add(act_event)

            session.commit()
            return self._to_pydantic_task(task_entity)

    def escalate_task(
        self,
        task_id: UUID,
        note: Optional[str] = None,
        actor_name: str = settings.CURRENT_USER_NAME,
        actor_role: str = settings.CURRENT_USER_ROLE,
    ) -> OperationalTask:
        """Record an escalation event for a task."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
                raise ValueError(f"Cannot escalate task {task_id} with status {task_entity.status}.")

            note_str = note.strip() if note and note.strip() else "Supervisor notified"
            act_event = TaskActivityEntity(
                task_id=task_id,
                room_id=task_entity.room_id,
                timestamp=datetime.now(timezone.utc),
                event_type="TASK_ESCALATED",
                title="Escalation",
                actor_name=actor_name,
                actor_role=actor_role,
                action=f"Escalated by {actor_name}",
                outcome=note_str,
            )
            session.add(act_event)

            session.commit()
            return self._to_pydantic_task(task_entity)

    def cancel_task(
        self,
        task_id: UUID,
        actor_name: str = settings.CURRENT_USER_NAME,
        actor_role: str = settings.CURRENT_USER_ROLE,
    ) -> OperationalTask:
        """Cancel a task, release staff, revert room status if needed, and log activity."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
                raise ValueError(f"Cannot cancel task {task_id} with status {task_entity.status}.")

            task_entity.status = TaskStatus.CANCELLED.value

            # Release staff
            if task_entity.assigned_staff_id:
                staff_entity = session.get(StaffEntity, task_entity.assigned_staff_id)
                if staff_entity:
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

            # Room status adjustment
            is_cleaning = (
                task_entity.task_type == TaskType.ROOM_CLEANING.value
                or "CLEAN" in str(task_entity.task_type).upper()
            )
            room_entity = session.get(RoomEntity, task_entity.room_id)
            if room_entity and room_entity.status != RoomStatus.OCCUPIED.value:
                if is_cleaning and room_entity.status == RoomStatus.CLEANING.value:
                    remaining_cleaning_stmt = select(OperationalTaskEntity).where(
                        OperationalTaskEntity.room_id == task_entity.room_id,
                        OperationalTaskEntity.id != task_id,
                        OperationalTaskEntity.task_type == TaskType.ROOM_CLEANING.value,
                        OperationalTaskEntity.status.in_([
                            TaskStatus.ASSIGNED.value,
                            TaskStatus.IN_PROGRESS.value,
                        ]),
                    )
                    remaining_cleaning = list(session.execute(remaining_cleaning_stmt).scalars().all())
                    if not remaining_cleaning:
                        room_entity.status = RoomStatus.DIRTY.value

            act_event = TaskActivityEntity(
                task_id=task_id,
                room_id=task_entity.room_id,
                timestamp=datetime.now(timezone.utc),
                event_type="TASK_CANCELLED",
                title="Task cancelled",
                actor_name=actor_name,
                actor_role=actor_role,
                action=f"Cancelled by {actor_name}",
                outcome="Task cancelled",
            )
            session.add(act_event)

            session.commit()
            return self._to_pydantic_task(task_entity)

    def reassign_task(
        self,
        task_id: UUID,
        staff_id: int,
        actor_name: str = settings.CURRENT_USER_NAME,
        actor_role: str = settings.CURRENT_USER_ROLE,
    ) -> OperationalTask:
        """Reassign task to another staff member with validation in one transaction."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
                raise ValueError(f"Cannot reassign task {task_id} with status {task_entity.status}.")

            new_staff = session.get(StaffEntity, staff_id)
            if not new_staff:
                raise ValueError(f"Staff with ID {staff_id} not found.")

            is_cleaning = (
                task_entity.task_type == TaskType.ROOM_CLEANING.value
                or "CLEAN" in str(task_entity.task_type).upper()
            )
            required_role = StaffRole.HOUSEKEEPING.value if is_cleaning else StaffRole.MAINTENANCE.value
            if new_staff.role != required_role:
                raise ValueError(f"Staff {new_staff.name} role is {new_staff.role}, but task requires {required_role}.")

            old_staff_id = task_entity.assigned_staff_id
            old_staff = session.get(StaffEntity, old_staff_id) if old_staff_id else None
            old_name = old_staff.name if old_staff else "Unassigned"

            if old_staff and old_staff.id != staff_id:
                # Decrement old staff workload
                old_remaining_stmt = select(OperationalTaskEntity).where(
                    OperationalTaskEntity.assigned_staff_id == old_staff.id,
                    OperationalTaskEntity.id != task_id,
                    OperationalTaskEntity.status.in_([
                        TaskStatus.PENDING.value,
                        TaskStatus.ASSIGNED.value,
                        TaskStatus.IN_PROGRESS.value,
                    ]),
                )
                old_remaining = list(session.execute(old_remaining_stmt).scalars().all())
                old_staff.active_task_count = len(old_remaining)
                if not old_remaining:
                    old_staff.is_available = True
                    old_staff.assigned_room_id = None
                else:
                    old_staff.assigned_room_id = old_remaining[0].room_id

            # Assign new staff
            task_entity.assigned_staff_id = staff_id
            if task_entity.status == TaskStatus.PENDING.value:
                task_entity.status = TaskStatus.ASSIGNED.value

            new_staff.active_task_count += 1
            new_staff.is_available = False
            new_staff.assigned_room_id = task_entity.room_id

            # Update maintenance incident technician if applicable
            if not is_cleaning:
                inc_stmt = select(MaintenanceIncidentEntity).where(
                    MaintenanceIncidentEntity.operational_task_id == task_id
                )
                incidents = session.execute(inc_stmt).scalars().all()
                for inc in incidents:
                    inc.assigned_technician_id = staff_id

            title = "Cleaner reassigned" if is_cleaning else "Technician reassigned"
            act_event = TaskActivityEntity(
                task_id=task_id,
                room_id=task_entity.room_id,
                timestamp=datetime.now(timezone.utc),
                event_type="TASK_REASSIGNED",
                title=title,
                actor_name=actor_name,
                actor_role=actor_role,
                action=f"Reassigned from {old_name} → {new_staff.name} by {actor_name}",
                outcome="Manual assignment",
            )
            session.add(act_event)

            session.commit()
            return self._to_pydantic_task(task_entity)

    def change_task_priority(
        self,
        task_id: UUID,
        priority_str: str,
        actor_name: str = settings.CURRENT_USER_NAME,
        actor_role: str = settings.CURRENT_USER_ROLE,
    ) -> OperationalTask:
        """Change task priority level and priority score, recorded as a human override."""
        p_up = priority_str.strip().upper()
        prio_map = {
            "CRITICAL": (100, "URGENT", MaintenanceSeverity.CRITICAL),
            "URGENT": (100, "URGENT", MaintenanceSeverity.CRITICAL),
            "HIGH": (80, "HIGH", MaintenanceSeverity.HIGH),
            "MEDIUM": (50, "STANDARD", MaintenanceSeverity.MEDIUM),
            "STANDARD": (50, "STANDARD", MaintenanceSeverity.MEDIUM),
            "LOW": (20, "NORMAL", MaintenanceSeverity.LOW),
            "NORMAL": (20, "NORMAL", MaintenanceSeverity.LOW),
        }
        if p_up not in prio_map:
            raise ValueError(f"Invalid priority '{priority_str}'. Must be HIGH, MEDIUM, or LOW.")

        new_score, new_level, new_sev = prio_map[p_up]

        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            if task_entity.status in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
                raise ValueError(f"Cannot change priority for task {task_id} with status {task_entity.status}.")

            old_level = task_entity.priority_level
            task_entity.priority_score = new_score
            task_entity.priority_level = new_level

            # Update maintenance incident severity if applicable
            is_cleaning = (
                task_entity.task_type == TaskType.ROOM_CLEANING.value
                or "CLEAN" in str(task_entity.task_type).upper()
            )
            if not is_cleaning:
                inc_stmt = select(MaintenanceIncidentEntity).where(
                    MaintenanceIncidentEntity.operational_task_id == task_id
                )
                incidents = session.execute(inc_stmt).scalars().all()
                for inc in incidents:
                    inc.severity = new_sev.value

            act_event = TaskActivityEntity(
                task_id=task_id,
                room_id=task_entity.room_id,
                timestamp=datetime.now(timezone.utc),
                event_type="PRIORITY_CHANGED",
                title="Human override",
                actor_name=actor_name,
                actor_role=actor_role,
                action=f"Priority changed from {old_level.upper()} → {new_level.upper()} by {actor_name}",
                outcome="Human override recorded",
            )
            session.add(act_event)

            session.commit()
            return self._to_pydantic_task(task_entity)

    def get_assignable_staff(self, task_id: UUID) -> List[dict]:
        """List staff of the right role who can be assigned to the task with open task count."""
        with self.session_factory() as session:
            task_entity = session.get(OperationalTaskEntity, task_id)
            if not task_entity:
                raise ValueError(f"Task with ID {task_id} not found.")

            room_entity = session.get(RoomEntity, task_entity.room_id)
            room_floor = room_entity.floor if room_entity else None

            is_cleaning = (
                task_entity.task_type == TaskType.ROOM_CLEANING.value
                or "CLEAN" in str(task_entity.task_type).upper()
            )
            target_role = StaffRole.HOUSEKEEPING.value if is_cleaning else StaffRole.MAINTENANCE.value

            staff_entities = list(
                session.execute(
                    select(StaffEntity).where(StaffEntity.role == target_role)
                ).scalars().all()
            )

            # Check required skill for maintenance
            req_skill = None
            if not is_cleaning:
                inc_stmt = select(MaintenanceIncidentEntity).where(
                    MaintenanceIncidentEntity.operational_task_id == task_id
                )
                inc = session.execute(inc_stmt).scalar_one_or_none()
                if inc:
                    from app.agents.maintenance_agent import MaintenanceAgent
                    m_agent = MaintenanceAgent(self)
                    req_skill = m_agent._get_required_skill(MaintenanceCategory(inc.category)).value

            results = []
            for s in staff_entities:
                staff_pydantic = self._to_pydantic_staff(s)
                skills_list = [sk.value if hasattr(sk, "value") else str(sk) for sk in staff_pydantic.skills]
                has_req_skill = True if (req_skill is None or req_skill in skills_list) else False
                is_current = (s.id == task_entity.assigned_staff_id)
                is_same_floor = (room_floor is not None and s.assigned_floor == room_floor)

                # Status label: Available, Busy, Offline
                if not s.is_available and s.active_task_count == 0:
                    avail_str = "Offline"
                elif s.active_task_count > 0:
                    avail_str = "Busy"
                else:
                    avail_str = "Available"

                results.append({
                    "id": s.id,
                    "name": s.name,
                    "role": s.role,
                    "assigned_floor": s.assigned_floor,
                    "is_available": s.is_available,
                    "availability": avail_str,
                    "active_task_count": s.active_task_count,
                    "is_current_assignee": is_current,
                    "is_same_floor": is_same_floor,
                    "skills": skills_list,
                    "has_required_skill": has_req_skill,
                })

            # Sort: current assignee first, then matching skill, then availability, then lowest workload, then same floor
            results.sort(
                key=lambda x: (
                    0 if x["is_current_assignee"] else 1,
                    0 if x["has_required_skill"] else 1,
                    0 if x["availability"] in ("Available", "Busy") else 1,
                    0 if x["is_same_floor"] else 1,
                    x["active_task_count"],
                    x["id"],
                )
            )
            return results

    def get_task_detail(self, task_id: UUID) -> dict:
        """Fetch complete rich detail payload for the task drawer."""
        with self.session_factory() as session:
            # Deterministic sequence number partition
            seq_subq = (
                select(
                    OperationalTaskEntity.id.label("task_id"),
                    func.row_number()
                    .over(
                        partition_by=OperationalTaskEntity.task_type,
                        order_by=[
                            OperationalTaskEntity.created_at.asc(),
                            OperationalTaskEntity.id.asc(),
                        ],
                    )
                    .label("seq_num"),
                )
            ).subquery()

            stmt = (
                select(
                    OperationalTaskEntity,
                    seq_subq.c.seq_num,
                    RoomEntity,
                    StaffEntity,
                    MaintenanceIncidentEntity,
                )
                .join(seq_subq, OperationalTaskEntity.id == seq_subq.c.task_id)
                .outerjoin(RoomEntity, OperationalTaskEntity.room_id == RoomEntity.id)
                .outerjoin(StaffEntity, OperationalTaskEntity.assigned_staff_id == StaffEntity.id)
                .outerjoin(
                    MaintenanceIncidentEntity,
                    OperationalTaskEntity.id == MaintenanceIncidentEntity.operational_task_id,
                )
                .where(OperationalTaskEntity.id == task_id)
            )

            row = session.execute(stmt).first()
            if not row:
                raise ValueError(f"Task with ID {task_id} not found.")

            task_ent = row[0]
            seq_num = row[1] or 1
            room_ent = row[2]
            staff_ent = row[3]
            inc_ent = row[4]

            is_cleaning = (
                task_ent.task_type == TaskType.ROOM_CLEANING.value
                or "CLEAN" in str(task_ent.task_type).upper()
            )
            prefix = "HK" if is_cleaning else "MT"
            display_id = f"{prefix}-{seq_num:04d}"

            now_utc = datetime.now(timezone.utc)

            # Timestamps
            created_dt = task_ent.created_at
            if created_dt and created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
            created_iso = created_dt.isoformat() if created_dt else None

            started_dt = task_ent.started_at
            if started_dt and started_dt.tzinfo is None:
                started_dt = started_dt.replace(tzinfo=timezone.utc)
            started_iso = started_dt.isoformat() if started_dt else None

            # Elapsed minutes
            elapsed_minutes = (
                max(0, int((now_utc - started_dt).total_seconds() / 60))
                if started_dt
                else None
            )

            # Room type & Expected minutes
            room_type_str = room_ent.room_type if room_ent else "STANDARD"
            if is_cleaning:
                expected_mins = DEFAULT_CLEANING_MINUTES_BY_ROOM_TYPE.get(
                    (room_type_str or "").upper(), DEFAULT_CLEANING_MINUTES_FALLBACK
                )
            else:
                expected_mins = inc_ent.sla_minutes if inc_ent and inc_ent.sla_minutes else 60

            # Priority label
            p_level = str(task_ent.priority_level).upper()
            priority_label_map = {
                "URGENT": "Critical",
                "CRITICAL": "Critical",
                "HIGH": "High",
                "STANDARD": "Medium",
                "MEDIUM": "Medium",
                "NORMAL": "Low",
                "LOW": "Low",
            }
            priority_label = priority_label_map.get(p_level, task_ent.priority_level)

            # Status label
            st_val = str(task_ent.status).upper()
            if st_val == "IN_PROGRESS":
                status_label = "Cleaning" if is_cleaning else "In repair"
            elif st_val == "PENDING":
                status_label = "Pending"
            elif st_val == "ASSIGNED":
                status_label = "Assigned"
            elif st_val == "ON_HOLD":
                status_label = "Blocked"
            elif st_val == "COMPLETED":
                status_label = "Completed"
            elif st_val == "CANCELLED":
                status_label = "Cancelled"
            elif st_val == "FAILED":
                status_label = "Failed"
            else:
                status_label = st_val.capitalize()

            # Description
            if is_cleaning:
                description = task_ent.notes or f"{room_type_str.title()} room cleaning"
            else:
                description = (
                    inc_ent.description
                    if inc_ent
                    else (task_ent.notes or "Maintenance repair")
                )

            # SLA deadline for maintenance
            sla_deadline_iso = None
            if not is_cleaning and inc_ent and inc_ent.sla_minutes:
                base_time = inc_ent.created_at or task_ent.created_at
                if base_time:
                    if base_time.tzinfo is None:
                        base_time = base_time.replace(tzinfo=timezone.utc)
                    deadline_dt = base_time + timedelta(minutes=inc_ent.sla_minutes)
                    sla_deadline_iso = deadline_dt.isoformat()

            # Next guest lookup
            next_guest_dict = None
            if room_ent:
                res_stmt = (
                    select(ReservationEntity, GuestEntity)
                    .join(GuestEntity, ReservationEntity.guest_id == GuestEntity.id)
                    .where(
                        ReservationEntity.room_id == room_ent.id,
                        ReservationEntity.check_out_time >= now_utc - timedelta(days=1),
                    )
                    .order_by(ReservationEntity.check_in_time.asc())
                    .limit(1)
                )
                res_row = session.execute(res_stmt).first()
                if res_row:
                    res_ent, g_ent = res_row
                    ci_dt = res_ent.check_in_time
                    if ci_dt and ci_dt.tzinfo is None:
                        ci_dt = ci_dt.replace(tzinfo=timezone.utc)
                    is_vip = bool(g_ent.guest_type and "VIP" in g_ent.guest_type.upper())
                    diff_sec = (ci_dt - now_utc).total_seconds() if ci_dt else 0
                    diff_min = int(diff_sec / 60)
                    if diff_min > 0:
                        if diff_min < 60:
                            arr_label = f"arriving in {diff_min}m"
                        else:
                            h = diff_min // 60
                            m = diff_min % 60
                            arr_label = f"arriving in {h}h {m}m" if m > 0 else f"arriving in {h}h"
                    else:
                        arr_label = "arrived / in-house"

                    next_guest_dict = {
                        "name": f"{g_ent.first_name} {g_ent.last_name}".strip(),
                        "is_vip": is_vip,
                        "arrival_time": ci_dt.isoformat() if ci_dt else None,
                        "label": arr_label,
                    }

            # Fetch activity events for this task
            act_stmt = (
                select(TaskActivityEntity)
                .where(TaskActivityEntity.task_id == task_id)
                .order_by(TaskActivityEntity.timestamp.desc(), TaskActivityEntity.id.desc())
            )
            act_entities = list(session.execute(act_stmt).scalars().all())

            activity_list = [
                {
                    "id": str(a.id),
                    "timestamp": (
                        a.timestamp.replace(tzinfo=timezone.utc)
                        if a.timestamp.tzinfo is None
                        else a.timestamp
                    ).isoformat(),
                    "title": a.title,
                    "actor_name": a.actor_name,
                    "actor_role": a.actor_role,
                    "action": a.action,
                    "outcome": a.outcome,
                }
                for a in act_entities
            ]

            # AI Assigned flag & assigned_by
            has_reassign = any(a.event_type == "TASK_REASSIGNED" for a in act_entities)
            ai_assigned = not has_reassign
            if has_reassign:
                # Find last reassign actor
                last_reassign = next((a for a in act_entities if a.event_type == "TASK_REASSIGNED"), None)
                assigned_by = last_reassign.actor_name if last_reassign else settings.CURRENT_USER_NAME
            else:
                assigned_by = "Housekeeping Agent" if is_cleaning else "Maintenance Agent"

            # Allowed actions based on status
            if st_val in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value, TaskStatus.FAILED.value):
                allowed_actions = []
            elif st_val == TaskStatus.IN_PROGRESS.value:
                allowed_actions = ["complete", "block", "escalate", "cancel", "reassign", "priority"]
            elif st_val == TaskStatus.ON_HOLD.value:
                allowed_actions = ["start", "escalate", "cancel", "reassign", "priority"]
            elif st_val in (TaskStatus.ASSIGNED.value, TaskStatus.PENDING.value):
                allowed_actions = ["start", "block", "escalate", "cancel", "reassign", "priority"]
            else:
                allowed_actions = ["start", "block", "escalate", "cancel", "reassign", "priority"]

            return {
                "id": str(task_ent.id),
                "display_id": display_id,
                "task_type": task_ent.task_type,
                "type_label": "Cleaning" if is_cleaning else "Maintenance",
                "status": task_ent.status,
                "status_label": status_label,
                "priority_level": task_ent.priority_level,
                "priority_label": priority_label,
                "priority_score": task_ent.priority_score,
                "ai_assigned": ai_assigned,
                "assigned_by": assigned_by,
                "room": {
                    "id": room_ent.id if room_ent else task_ent.room_id,
                    "number": room_ent.room_number if room_ent else str(task_ent.room_id),
                    "type": room_type_str,
                    "floor": room_ent.floor if room_ent else 1,
                    "status": room_ent.status if room_ent else "DIRTY",
                },
                "expected_minutes": expected_mins,
                "created_at": created_iso,
                "started_at": started_iso,
                "elapsed_minutes": elapsed_minutes,
                "next_guest": next_guest_dict,
                "assigned_staff": {
                    "id": staff_ent.id,
                    "name": staff_ent.name,
                    "role": staff_ent.role,
                    "assigned_floor": staff_ent.assigned_floor,
                } if staff_ent else None,
                "description": description,
                "incident": {
                    "category": inc_ent.category,
                    "severity": inc_ent.severity,
                    "sla_minutes": inc_ent.sla_minutes,
                    "sla_deadline": sla_deadline_iso,
                } if inc_ent else None,
                "activity": activity_list,
                "allowed_actions": allowed_actions,
            }



