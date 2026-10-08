"""
Dev-only script to seed 5 OCCUPIED test rooms with active reservations.

Features:
- Sets 5 rooms (e.g. 101, 201, 301, 401, 501) to OCCUPIED.
- Ensures each room has a matching active reservation.
- Clears old tasks and incidents ONLY for these 5 rooms.
- NEVER runs automatically.
- Does NOT wipe or touch other rooms or hotel data.

Usage:
    python scripts/seed_test_rooms.py
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select, or_
from app.database.connection import SessionLocal
from app.database.orm.room_entity import RoomEntity
from app.database.orm.guest_entity import GuestEntity
from app.database.orm.reservation_entity import ReservationEntity
from app.database.orm.operational_task_entity import OperationalTaskEntity
from app.database.orm.task_activity_entity import TaskActivityEntity
from app.database.orm.maintenance_incident_entity import MaintenanceIncidentEntity
from app.models.enums import RoomStatus


TARGET_ROOM_NUMBERS = ["101", "201", "301", "401", "501"]


def seed_test_rooms():
    session = SessionLocal()
    now_utc = datetime.now(timezone.utc)

    try:
        # 1. Ensure at least one default guest exists for reservations
        guest = session.get(GuestEntity, 101)
        if not guest:
            guest = GuestEntity(
                id=101,
                first_name="Rahul",
                last_name="Patil",
                guest_type="REGULAR"
            )
            session.add(guest)
            session.flush()

        # 2. Lookup the target 5 rooms
        rooms_stmt = select(RoomEntity).where(
            RoomEntity.room_number.in_(TARGET_ROOM_NUMBERS)
        ).order_by(RoomEntity.floor.asc())
        rooms = list(session.execute(rooms_stmt).scalars().all())

        if len(rooms) < len(TARGET_ROOM_NUMBERS):
            # Fallback: grab any 5 rooms if specific room numbers aren't found
            rooms = list(session.execute(select(RoomEntity).limit(5)).scalars().all())

        room_ids = [r.id for r in rooms]

        # 3. Clean up tasks and incidents ONLY for these 5 rooms
        # Remove task activities for tasks belonging to these rooms
        tasks_stmt = select(OperationalTaskEntity).where(
            OperationalTaskEntity.room_id.in_(room_ids)
        )
        tasks = list(session.execute(tasks_stmt).scalars().all())
        task_ids = [t.id for t in tasks]

        if task_ids:
            act_stmt = select(TaskActivityEntity).where(
                or_(
                    TaskActivityEntity.task_id.in_(task_ids),
                    TaskActivityEntity.room_id.in_(room_ids)
                )
            )
            activities = list(session.execute(act_stmt).scalars().all())
            for act in activities:
                session.delete(act)

        # Delete maintenance incidents for these rooms
        inc_stmt = select(MaintenanceIncidentEntity).where(
            MaintenanceIncidentEntity.room_id.in_(room_ids)
        )
        incidents = list(session.execute(inc_stmt).scalars().all())
        for inc in incidents:
            session.delete(inc)

        # Delete operational tasks for these rooms
        for task in tasks:
            session.delete(task)

        session.flush()

        # 4. Set each of the 5 rooms to OCCUPIED and create/update active reservation
        seeded_info = []
        base_res_id = 9001

        for idx, room in enumerate(rooms):
            room.status = RoomStatus.OCCUPIED.value

            # Check existing reservation or create new active reservation
            res_stmt = select(ReservationEntity).where(
                ReservationEntity.room_id == room.id
            ).order_by(ReservationEntity.check_out_time.desc())
            existing_res = session.execute(res_stmt).scalars().first()

            if existing_res:
                existing_res.check_in_time = now_utc - timedelta(days=1)
                existing_res.check_out_time = now_utc + timedelta(days=1)
                existing_res.guest_id = guest.id
                res_id = existing_res.id
            else:
                new_res_id = base_res_id + idx
                # Ensure unique ID
                while session.get(ReservationEntity, new_res_id):
                    new_res_id += 1
                new_res = ReservationEntity(
                    id=new_res_id,
                    guest_id=guest.id,
                    room_id=room.id,
                    check_in_time=now_utc - timedelta(days=1),
                    check_out_time=now_utc + timedelta(days=1),
                    early_check_in_requested=False,
                )
                session.add(new_res)
                res_id = new_res_id

            seeded_info.append({
                "room_number": room.room_number,
                "room_id": room.id,
                "floor": room.floor,
                "type": room.room_type,
                "status": "OCCUPIED",
                "reservation_id": res_id,
                "guest": f"{guest.first_name} {guest.last_name}",
            })

        session.commit()

        print("\n" + "=" * 60)
        print("  DEV SEED: 5 OCCUPIED Test Rooms Successfully Prepared")
        print("=" * 60)
        print(f"{'Room #':<8} {'Room ID':<10} {'Floor':<8} {'Type':<12} {'Status':<10} {'Res ID':<8}")
        print("-" * 60)
        for r in seeded_info:
            print(f"{r['room_number']:<8} {r['room_id']:<10} {r['floor']:<8} {r['type']:<12} {r['status']:<10} {r['reservation_id']:<8}")
        print("=" * 60)
        print("Old tasks and incidents for these 5 rooms were cleared.")
        print("All other rooms and database data remain untouched.\n")

    except Exception as e:
        session.rollback()
        print(f"Error seeding test rooms: {e}")
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    seed_test_rooms()
