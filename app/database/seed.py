import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is in sys.path when executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import select, text
from app.database.base import Base
from app.database import (
    GuestEntity,
    ReservationEntity,
    RoomEntity,
    SessionLocal,
    StaffEntity,
)


def seed_rooms(session) -> tuple[int, int]:
    """Seed exactly 50 hotel rooms across floors 1 to 5 (10 rooms per floor)."""
    inserted = 0
    skipped = 0

    # 1. Ensure existing fixed rooms 405 (ID 1) and 406 (ID 2) on Floor 4 exist
    fixed_rooms = [
        {
            "id": 1,
            "property_id": 1,
            "room_number": "405",
            "floor": 4,
            "room_type": "DELUXE",
            "status": "OCCUPIED",
        },
        {
            "id": 2,
            "property_id": 1,
            "room_number": "406",
            "floor": 4,
            "room_type": "STANDARD",
            "status": "READY",
        },
    ]
    for item in fixed_rooms:
        existing = session.get(RoomEntity, item["id"])
        if not existing:
            session.add(RoomEntity(**item))
            inserted += 1
        else:
            existing.status = item["status"]
            existing.room_type = item["room_type"]
            existing.floor = item["floor"]
            existing.room_number = item["room_number"]
            skipped += 1

    session.flush()

    # Query all existing room_numbers for property_id=1 to guarantee idempotency
    existing_rooms_stmt = select(RoomEntity.room_number).where(RoomEntity.property_id == 1)
    existing_numbers = set(session.execute(existing_rooms_stmt).scalars().all())

    # 2. Add or reset remaining 48 rooms across floors 1 to 5
    for floor in range(1, 6):
        for room_idx in range(1, 11):
            room_number = f"{floor}{room_idx:02d}"
            if room_number in ("405", "406"):
                continue

            room_type = "DELUXE" if room_idx <= 5 else "STANDARD"
            status = "DIRTY" if room_idx in (3, 7) else "READY"

            if room_number not in existing_numbers:
                session.add(
                    RoomEntity(
                        property_id=1,
                        room_number=room_number,
                        floor=floor,
                        room_type=room_type,
                        status=status,
                    )
                )
                existing_numbers.add(room_number)
                inserted += 1
            else:
                existing_room = session.execute(
                    select(RoomEntity).where(RoomEntity.property_id == 1, RoomEntity.room_number == room_number)
                ).scalar_one_or_none()
                if existing_room:
                    existing_room.status = status
                    existing_room.room_type = room_type
                    existing_room.floor = floor
                skipped += 1

    session.flush()
    return inserted, skipped


def seed_db() -> dict:
    """Seed initial hotel operations mock data into PostgreSQL idempotently."""
    session = SessionLocal()
    inserted_counts = {"rooms": 0, "guests": 0, "reservations": 0, "staff": 0}
    skipped_counts = {"rooms": 0, "guests": 0, "reservations": 0, "staff": 0}

    try:
        from app.database.connection import engine
        Base.metadata.create_all(bind=engine)
        session.execute(text("ALTER TABLE operational_tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS category_reason VARCHAR(500);"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS severity_reason VARCHAR(500);"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS confidence_score VARCHAR(20);"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS safety_rule_applied BOOLEAN DEFAULT FALSE;"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS safety_rule_text VARCHAR(500);"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS technician_match_reason VARCHAR(500);"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN DEFAULT FALSE;"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN DEFAULT FALSE;"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;"))
        session.execute(text("ALTER TABLE maintenance_incidents ADD COLUMN IF NOT EXISTS original_ai_decision JSON;"))
        session.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills JSON;"))
        session.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30) DEFAULT 'AVAILABLE';"))
        session.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS availability_note VARCHAR(100);"))

        # Clear maintenance incidents, task activities, and operational tasks on reset
        session.execute(text("DELETE FROM task_activities;"))
        session.execute(text("DELETE FROM maintenance_incidents;"))
        session.execute(text("DELETE FROM operational_tasks;"))
        # Clear any test-injected non-seed rows to avoid leaks
        session.execute(text("DELETE FROM reservations WHERE id NOT IN (5001, 5002, 5003, 5004, 5005);"))
        session.execute(text("DELETE FROM guests WHERE id NOT IN (101, 102);"))
        session.execute(text("DELETE FROM staff WHERE id NOT IN (201, 202, 203, 301, 302, 303);"))
        session.commit()


        # 1. Rooms Seed Data
        rooms_inserted, rooms_skipped = seed_rooms(session)
        inserted_counts["rooms"] += rooms_inserted
        skipped_counts["rooms"] += rooms_skipped

        # 2. Guests Seed Data
        guests_data = [
            {
                "id": 101,
                "first_name": "Rahul",
                "last_name": "Patil",
                "guest_type": "REGULAR",
            },
            {
                "id": 102,
                "first_name": "Amit",
                "last_name": "Sharma",
                "guest_type": "VIP",
            },
        ]
        for item in guests_data:
            existing = session.get(GuestEntity, item["id"])
            if not existing:
                session.add(GuestEntity(**item))
                inserted_counts["guests"] += 1
            else:
                skipped_counts["guests"] += 1

        # Flush rooms and guests to ensure foreign key availability
        session.flush()

        # 3. Reservations Seed Data
        reservations_data = [
            {
                "id": 5001,
                "guest_id": 101,
                "room_id": 1,
                "check_in_time": datetime(2026, 8, 28, 14, 0, tzinfo=timezone.utc),
                "check_out_time": datetime(2026, 8, 29, 10, 0, tzinfo=timezone.utc),
                "early_check_in_requested": False,
            },
            {
                "id": 5002,
                "guest_id": 102,
                "room_id": 2,
                "check_in_time": datetime(2026, 8, 29, 13, 0, tzinfo=timezone.utc),
                "check_out_time": datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc),
                "early_check_in_requested": True,
            },
            {
                "id": 5003,
                "guest_id": 101,
                "room_id": 1,
                "check_in_time": datetime(2026, 8, 29, 14, 0, tzinfo=timezone.utc),
                "check_out_time": datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc),
                "early_check_in_requested": False,
            },
            {
                "id": 5004,
                "guest_id": 101,
                "room_id": 1,
                "check_in_time": datetime(2026, 8, 30, 14, 0, tzinfo=timezone.utc),
                "check_out_time": datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc),
                "early_check_in_requested": False,
            },
            {
                "id": 5005,
                "guest_id": 101,
                "room_id": 1,
                "check_in_time": datetime(2026, 9, 1, 14, 0, tzinfo=timezone.utc),
                "check_out_time": datetime(2026, 9, 2, 10, 0, tzinfo=timezone.utc),
                "early_check_in_requested": False,
            },
        ]
        for item in reservations_data:
            existing = session.get(ReservationEntity, item["id"])
            if not existing:
                session.add(ReservationEntity(**item))
                inserted_counts["reservations"] += 1
            else:
                existing.room_id = item["room_id"]
                existing.guest_id = item["guest_id"]
                skipped_counts["reservations"] += 1

        # 4. Staff Seed Data
        staff_data = [
            {
                "id": 201,
                "name": "Priya Deshmukh",
                "role": "HOUSEKEEPING",
                "assigned_floor": 4,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
                "skills": [],
                "availability_status": "AVAILABLE",
                "availability_note": None,
            },
            {
                "id": 202,
                "name": "Neha Patil",
                "role": "HOUSEKEEPING",
                "assigned_floor": 4,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
                "skills": [],
                "availability_status": "AVAILABLE",
                "availability_note": None,
            },
            {
                "id": 203,
                "name": "Sunita More",
                "role": "HOUSEKEEPING",
                "assigned_floor": 3,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
                "skills": [],
                "availability_status": "AVAILABLE",
                "availability_note": None,
            },
            {
                "id": 301,
                "name": "Rakesh Jadhav",
                "role": "MAINTENANCE",
                "assigned_floor": 4,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
                "skills": ["HVAC", "GENERAL"],
                "availability_status": "AVAILABLE",
                "availability_note": None,
            },
            {
                "id": 302,
                "name": "Suresh Pawar",
                "role": "MAINTENANCE",
                "assigned_floor": 3,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
                "skills": ["ELECTRICAL", "PLUMBING", "GENERAL"],
                "availability_status": "AVAILABLE",
                "availability_note": None,
            },
            {
                "id": 303,
                "name": "Vikram Rane",
                "role": "MAINTENANCE",
                "assigned_floor": 2,
                "assigned_room_id": None,
                "is_available": False,
                "active_task_count": 0,
                "skills": ["PLUMBING", "GENERAL"],
                "availability_status": "OFFLINE",
                "availability_note": "Offline until 14:00",
            },
        ]
        for item in staff_data:
            existing = session.get(StaffEntity, item["id"])
            if not existing:
                session.add(StaffEntity(**item))
                inserted_counts["staff"] += 1
            else:
                existing.name = item["name"]
                existing.role = item["role"]
                existing.is_available = item["is_available"]
                existing.active_task_count = item["active_task_count"]
                existing.assigned_floor = item["assigned_floor"]
                existing.assigned_room_id = item["assigned_room_id"]
                existing.skills = item["skills"]
                existing.availability_status = item["availability_status"]
                existing.availability_note = item["availability_note"]
                skipped_counts["staff"] += 1

        session.commit()

        # Update postgres auto-increment sequence values
        for seq_name, table_name in [
            ("rooms_id_seq", "rooms"),
            ("guests_id_seq", "guests"),
            ("reservations_id_seq", "reservations"),
            ("staff_id_seq", "staff"),
        ]:
            session.execute(
                text(f"SELECT setval('{seq_name}', COALESCE((SELECT MAX(id) FROM {table_name}), 1));")
            )
        session.commit()

        return {"inserted": inserted_counts, "skipped": skipped_counts}

    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    res = seed_db()
    print("Seed operation complete:", res)
