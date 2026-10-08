"""
Dev-only script to seed 7-day historical tasks, activities, and incidents for the Reports page.

Features:
- Generates realistic completed housekeeping tasks and maintenance incidents across the past 7 days.
- Records task activities (STAFF_ASSIGNED with 'AI Agent', HUMAN_OVERRIDE, TASK_COMPLETED).
- Populates SLA-compliant maintenance incidents for categories (HVAC, Electrical, Plumbing, Access / Locks, Safety).
- Strictly dev-only and NEVER runs automatically.

Usage:
    python scripts/seed_demo_reports_history.py
"""

import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select
from app.database.connection import SessionLocal
from app.database.orm.room_entity import RoomEntity
from app.database.orm.staff_entity import StaffEntity
from app.database.orm.operational_task_entity import OperationalTaskEntity
from app.database.orm.task_activity_entity import TaskActivityEntity
from app.database.orm.maintenance_incident_entity import MaintenanceIncidentEntity
from app.models.enums import TaskPriority, TaskType


def seed_demo_reports_history():
    session = SessionLocal()
    now_utc = datetime.now(timezone.utc)

    try:
        rooms = list(session.execute(select(RoomEntity)).scalars().all())
        staff_members = list(session.execute(select(StaffEntity)).scalars().all())

        if not rooms or not staff_members:
            print("❌ Cannot seed: Please ensure rooms and staff exist in the database.")
            return

        housekeeping_staff = [s for s in staff_members if s.role in ("HOUSEKEEPING", "HOUSEKEEPING_ATTENDANT", "CLEANER")]
        if not housekeeping_staff:
            housekeeping_staff = staff_members

        maintenance_staff = [s for s in staff_members if s.role in ("MAINTENANCE", "TECHNICIAN")]
        if not maintenance_staff:
            maintenance_staff = staff_members

        print(f"📊 Seeding 7-day history across {len(rooms)} rooms and {len(staff_members)} staff members...")

        # Create tasks per day for days -6 to -1 (and a few for today)
        for day_offset in range(6, -1, -1):
            day_base = now_utc - timedelta(days=day_offset)
            # 15-25 cleaning tasks per day
            tasks_today_count = random.randint(18, 26)

            for _ in range(tasks_today_count):
                room = random.choice(rooms)
                assigned_cleaner = random.choice(housekeeping_staff)

                hour_offset = random.randint(8, 18)
                minute_offset = random.randint(0, 59)
                task_created_at = datetime(
                    day_base.year, day_base.month, day_base.day,
                    hour_offset, minute_offset, 0, tzinfo=timezone.utc
                )

                # Duration: 25 to 55 minutes
                duration_mins = random.randint(28, 48)
                completed_at = task_created_at + timedelta(minutes=duration_mins)

                is_ai = random.random() < 0.94  # 94% automation rate
                is_override = not is_ai or (random.random() < 0.03)

                task = OperationalTaskEntity(
                    room_id=room.id,
                    task_type="CLEANING",
                    priority="NORMAL",
                    status="COMPLETED",
                    assigned_staff_id=assigned_cleaner.id,
                    created_at=task_created_at,
                    started_at=task_created_at + timedelta(minutes=2),
                )
                session.add(task)
                session.flush()

                # Activity: STAFF_ASSIGNED
                act1 = TaskActivityEntity(
                    task_id=task.id,
                    event_type="STAFF_ASSIGNED",
                    actor_role="AI Agent" if is_ai else "Human Supervisor",
                    actor_name="Room Readiness Agent" if is_ai else "Front Desk Manager",
                    action_summary=f"Assigned task {task.id} to {assigned_cleaner.name}",
                    timestamp=task_created_at + timedelta(seconds=12),
                )
                session.add(act1)

                if is_override:
                    act_ov = TaskActivityEntity(
                        task_id=task.id,
                        event_type="HUMAN_OVERRIDE",
                        actor_role="Human Supervisor",
                        actor_name="Front Desk Manager",
                        action_summary=f"Re-prioritized task {task.id}",
                        timestamp=task_created_at + timedelta(minutes=5),
                    )
                    session.add(act_ov)

                # Activity: TASK_COMPLETED
                act2 = TaskActivityEntity(
                    task_id=task.id,
                    event_type="TASK_COMPLETED",
                    actor_role="Housekeeper",
                    actor_name=assigned_cleaner.name,
                    action_summary=f"Completed cleaning room {room.room_number}",
                    timestamp=completed_at,
                )
                session.add(act2)

            # Add 2-4 maintenance incidents per day
            incident_categories = [
                ("HVAC", "AC cooling temperature irregular", "MEDIUM", 60),
                ("Electrical", "Bedside reading lamp flickering", "LOW", 120),
                ("Plumbing", "Washroom tap pressure low", "MEDIUM", 60),
                ("Access / Locks", "Digital keycard reader slow", "HIGH", 30),
            ]

            for _ in range(random.randint(2, 4)):
                cat, desc, sev, sla_m = random.choice(incident_categories)
                room = random.choice(rooms)
                tech = random.choice(maintenance_staff)

                inc_hour = random.randint(9, 20)
                inc_min = random.randint(0, 59)
                inc_created_at = datetime(
                    day_base.year, day_base.month, day_base.day,
                    inc_hour, inc_min, 0, tzinfo=timezone.utc
                )

                m_task = OperationalTaskEntity(
                    room_id=room.id,
                    task_type="MAINTENANCE",
                    priority=sev,
                    status="COMPLETED",
                    assigned_staff_id=tech.id,
                    created_at=inc_created_at,
                    started_at=inc_created_at + timedelta(minutes=4),
                )
                session.add(m_task)
                session.flush()

                # Incident entity
                res_mins = random.randint(15, min(sla_m - 5, 55))
                incident = MaintenanceIncidentEntity(
                    room_id=room.id,
                    category=cat.upper().replace(" / ", "_").replace(" ", "_"),
                    description=desc,
                    severity=sev,
                    sla_minutes=sla_m,
                    status="RESOLVED",
                    assigned_staff_id=tech.id,
                    operational_task_id=m_task.id,
                    created_at=inc_created_at,
                    resolved_at=inc_created_at + timedelta(minutes=res_mins),
                )
                session.add(incident)

                # Activity: STAFF_ASSIGNED
                act_m1 = TaskActivityEntity(
                    task_id=m_task.id,
                    event_type="STAFF_ASSIGNED",
                    actor_role="AI Agent",
                    actor_name="Maintenance Dispatch Agent",
                    action_summary=f"Assigned incident repair to {tech.name}",
                    timestamp=inc_created_at + timedelta(seconds=45),
                )
                session.add(act_m1)

                # Activity: TASK_COMPLETED
                act_m2 = TaskActivityEntity(
                    task_id=m_task.id,
                    event_type="TASK_COMPLETED",
                    actor_role="Technician",
                    actor_name=tech.name,
                    action_summary=f"Resolved issue in Room {room.room_number}",
                    timestamp=inc_created_at + timedelta(minutes=res_mins),
                )
                session.add(act_m2)

        # Add 1 critical safety incident for demonstration
        crit_room = rooms[0]
        crit_tech = maintenance_staff[0]
        crit_created = now_utc - timedelta(days=1, hours=4)
        crit_task = OperationalTaskEntity(
            room_id=crit_room.id,
            task_type="MAINTENANCE",
            priority="CRITICAL",
            status="COMPLETED",
            assigned_staff_id=crit_tech.id,
            created_at=crit_created,
            started_at=crit_created + timedelta(minutes=2),
        )
        session.add(crit_task)
        session.flush()

        crit_inc = MaintenanceIncidentEntity(
            room_id=crit_room.id,
            category="SAFETY",
            description="Burning smell reported near electrical board",
            severity="CRITICAL",
            sla_minutes=15,
            status="RESOLVED",
            assigned_staff_id=crit_tech.id,
            operational_task_id=crit_task.id,
            created_at=crit_created,
            resolved_at=crit_created + timedelta(minutes=12),
        )
        session.add(crit_inc)

        act_crit = TaskActivityEntity(
            task_id=crit_task.id,
            event_type="STAFF_ASSIGNED",
            actor_role="AI Agent",
            actor_name="Maintenance Dispatch Agent",
            action_summary=f"CRITICAL: Dispatched {crit_tech.name} to Room {crit_room.room_number}",
            timestamp=crit_created + timedelta(seconds=130),  # 2m 10s response
        )
        session.add(act_crit)

        session.commit()
        print("✅ Successfully seeded 7 days of demo operational history for Reports!")

    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding reports history: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_demo_reports_history()
