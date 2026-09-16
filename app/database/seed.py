import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is in sys.path when executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import text
from app.database import (
    GuestEntity,
    ReservationEntity,
    RoomEntity,
    SessionLocal,
    StaffEntity,
)


def seed_db() -> dict:
    """Seed initial hotel operations mock data into PostgreSQL idempotently."""
    session = SessionLocal()
    inserted_counts = {"rooms": 0, "guests": 0, "reservations": 0, "staff": 0}
    skipped_counts = {"rooms": 0, "guests": 0, "reservations": 0, "staff": 0}

    try:
        # Clear operational tasks on reset
        session.execute(text("DELETE FROM operational_tasks;"))
        session.commit()

        # 1. Rooms Seed Data
        rooms_data = [
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
        for item in rooms_data:
            existing = session.get(RoomEntity, item["id"])
            if not existing:
                session.add(RoomEntity(**item))
                inserted_counts["rooms"] += 1
            else:
                existing.status = item["status"]
                skipped_counts["rooms"] += 1

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
            },
            {
                "id": 202,
                "name": "Neha Patil",
                "role": "HOUSEKEEPING",
                "assigned_floor": 4,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
            },
            {
                "id": 203,
                "name": "Sunita More",
                "role": "HOUSEKEEPING",
                "assigned_floor": 3,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
            },
            {
                "id": 301,
                "name": "Rakesh Jadhav",
                "role": "MAINTENANCE",
                "assigned_floor": 4,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
            },
            {
                "id": 302,
                "name": "Suresh Pawar",
                "role": "MAINTENANCE",
                "assigned_floor": 3,
                "assigned_room_id": None,
                "is_available": True,
                "active_task_count": 0,
            },
        ]
        for item in staff_data:
            existing = session.get(StaffEntity, item["id"])
            if not existing:
                session.add(StaffEntity(**item))
                inserted_counts["staff"] += 1
            else:
                existing.is_available = item["is_available"]
                existing.active_task_count = item["active_task_count"]
                existing.assigned_floor = item["assigned_floor"]
                existing.assigned_room_id = item["assigned_room_id"]
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
