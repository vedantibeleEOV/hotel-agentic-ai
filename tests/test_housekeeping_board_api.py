from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.database.orm import (
    GuestEntity,
    OperationalTaskEntity,
    ReservationEntity,
    RoomEntity,
    StaffEntity,
)
from app.main import app
from app.models.enums import RoomStatus, TaskStatus, TaskType

client = TestClient(app)







def test_housekeeping_board_structure_and_empty_state():
    """Test response structure, default database state, columns, and summary metrics."""
    res = client.get("/api/housekeeping/board")
    assert res.status_code == 200
    data = res.json()

    # 1. Top-level keys
    assert "summary" in data
    assert "columns" in data
    assert "attendants" in data
    assert "generated_at" in data

    # 2. Check generated_at timestamp is valid ISO UTC
    gen_at = datetime.fromisoformat(data["generated_at"])
    assert gen_at.tzinfo is not None

    # 3. Summary structure
    summary = data["summary"]
    assert "todays_workload" in summary
    assert "total" in summary["todays_workload"]
    assert "still_open" in summary["todays_workload"]

    assert "available_cleaners" in summary
    assert "available" in summary["available_cleaners"]
    assert "busy" in summary["available_cleaners"]
    assert "off" in summary["available_cleaners"]

    assert "in_progress" in summary
    assert "total" in summary["in_progress"]
    assert "awaiting_inspection" in summary["in_progress"]

    assert "completed_today" in summary
    assert "overdue" in summary
    assert "count" in summary["overdue"]
    assert isinstance(summary["overdue"]["rooms"], list)

    assert "priority_rooms" in summary
    assert "count" in summary["priority_rooms"]
    assert isinstance(summary["priority_rooms"]["rooms"], list)

    # 4. Columns structure matching prototype
    columns = data["columns"]
    assert len(columns) == 6
    expected_cols = [
        ("unassigned", "Unassigned", "Waiting for an attendant"),
        ("assigned", "Assigned", "Queued with an attendant"),
        ("cleaning", "Cleaning", "In progress"),
        ("inspection_required", "Inspection Required", "Supervisor check"),
        ("completed", "Completed", "Today"),
        ("blocked", "Blocked", "Needs a person"),
    ]
    for idx, (key, title, subtitle) in enumerate(expected_cols):
        col = columns[idx]
        assert col["key"] == key
        assert col["title"] == title
        assert col["subtitle"] == subtitle
        assert "count" in col
        assert isinstance(col["cards"], list)
        assert col["count"] == len(col["cards"])

    # 5. Attendants list
    attendants = data["attendants"]
    assert isinstance(attendants, list)
    assert len(attendants) >= 1
    for att in attendants:
        assert "id" in att
        assert "name" in att
        assert "floor" in att
        assert "open_task_count" in att
        assert att["availability"] in ("available", "busy", "off")


def test_housekeeping_board_tasks_and_card_fields():
    """Test task card generation, card fields, and placement in appropriate columns."""
    # Trigger a checkout to generate an active cleaning task
    checkout_res = client.post(
        "/api/events/checkout",
        json={
            "property_id": 1,
            "room_id": 1,
            "reservation_id": 5001,
            "checkout_time": "2026-10-05T12:00:00",
        },
    )
    assert checkout_res.status_code == 202

    res = client.get("/api/housekeeping/board")
    assert res.status_code == 200
    data = res.json()

    # Find the generated cleaning card
    all_cards = []
    for col in data["columns"]:
        all_cards.extend(col["cards"])

    cleaning_cards = [c for c in all_cards if c.get("room_number") == "405"]
    assert len(cleaning_cards) >= 1
    card = cleaning_cards[0]

    # Verify all expected card fields
    assert card["id"] is not None
    assert card["display_id"].startswith("HK-")
    assert card["room_number"] == "405"
    assert card["floor"] == 4
    assert card["room_type"] in ("DELUXE", "STANDARD")
    assert card["priority_label"] in ("Critical", "High", "Medium", "Low")
    assert card["priority_level"] in ("URGENT", "HIGH", "STANDARD", "NORMAL")
    assert isinstance(card["is_vip"], bool)
    assert card["ai_assigned"] is True
    assert card["expected_minutes"] in (30, 45)
    assert card["elapsed_minutes"] is not None
    assert isinstance(card["is_overdue"], bool)
    assert card["status"] in ("PENDING", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED")
    assert card["created_at"] is not None


def test_housekeeping_board_floor_filter():
    """Test filtering the board by floor query parameter."""
    # Trigger checkout on room 1 (floor 4)
    client.post(
        "/api/events/checkout",
        json={
            "property_id": 1,
            "room_id": 1,
            "reservation_id": 5001,
            "checkout_time": "2026-10-05T12:00:00",
        },
    )

    # 1. Floor 4 should have the card
    res_f4 = client.get("/api/housekeeping/board?floor=4")
    assert res_f4.status_code == 200
    data_f4 = res_f4.json()
    f4_cards = [c for col in data_f4["columns"] for c in col["cards"]]
    assert any(c.get("room_number") == "405" for c in f4_cards)
    for c in f4_cards:
        assert c["floor"] == 4

    # 2. Floor 1 should NOT have the room 405 card
    res_f1 = client.get("/api/housekeeping/board?floor=1")
    assert res_f1.status_code == 200
    data_f1 = res_f1.json()
    f1_cards = [c for col in data_f1["columns"] for c in col["cards"]]
    assert not any(c.get("room_number") == "405" for c in f1_cards)


def test_housekeeping_board_inspection_ready_synthetic_card():
    """Test that rooms in INSPECTION status without tasks still appear in Inspection Required column."""
    with SessionLocal() as session:
        room = session.query(RoomEntity).filter_by(room_number="102").first()
        assert room is not None
        room.status = RoomStatus.INSPECTION.value
        session.commit()

    res = client.get("/api/housekeeping/board")
    assert res.status_code == 200
    data = res.json()

    insp_col = next(c for c in data["columns"] if c["key"] == "inspection_required")
    insp_102 = next((c for c in insp_col["cards"] if c["room_number"] == "102"), None)

    assert insp_102 is not None
    assert insp_102["id"] is None
    assert insp_102["display_id"] is None
    assert insp_102["status"] == "INSPECTION"
    assert insp_102["floor"] == 1
    assert insp_102["description"] is not None


def test_housekeeping_board_attendant_availability_rules():
    """Test attendant availability calculation: busy (IN_PROGRESS), off (unavailable + no open tasks), available."""
    now_utc = datetime.now(timezone.utc)
    with SessionLocal() as session:
        # Use existing seeded staff 201, 202, 203
        st_busy = session.get(StaffEntity, 201)
        st_off = session.get(StaffEntity, 202)
        st_avail_queued = session.get(StaffEntity, 203)

        st_busy.is_available = False
        st_busy.active_task_count = 1

        st_off.is_available = False
        st_off.active_task_count = 0

        st_avail_queued.is_available = True
        st_avail_queued.active_task_count = 1

        task_in_prog = OperationalTaskEntity(
            id=uuid4(),
            room_id=1,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=100,
            priority_level="STANDARD",
            status=TaskStatus.IN_PROGRESS.value,
            assigned_staff_id=201,
            created_at=now_utc,
        )
        task_assigned = OperationalTaskEntity(
            id=uuid4(),
            room_id=2,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=100,
            priority_level="STANDARD",
            status=TaskStatus.ASSIGNED.value,
            assigned_staff_id=203,
            created_at=now_utc,
        )
        session.add_all([task_in_prog, task_assigned])
        session.commit()

    res = client.get("/api/housekeeping/board")
    assert res.status_code == 200
    attendants = {a["id"]: a for a in res.json()["attendants"]}

    assert attendants[201]["availability"] == "busy"
    assert attendants[202]["availability"] == "off"
    assert attendants[203]["availability"] == "available"
    assert attendants[203]["open_task_count"] == 1


def test_housekeeping_board_overdue_and_priority_logic():
    """Test overdue calculation and priority room identification."""
    now_utc = datetime.now(timezone.utc)
    old_time = now_utc - timedelta(hours=2)

    with SessionLocal() as session:
        # Create an overdue cleaning task created 2 hours ago with 30 min SLA on Room 1 (405)
        task_overdue = OperationalTaskEntity(
            id=uuid4(),
            room_id=1,  # Room 405
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=150,
            priority_level="HIGH",
            status=TaskStatus.IN_PROGRESS.value,
            created_at=old_time,
        )
        session.add(task_overdue)

        # Update reservation 5002 on room 2 (VIP guest 102 Amit Sharma)
        res_vip = session.get(ReservationEntity, 5002)
        if res_vip:
            res_vip.check_in_time = now_utc + timedelta(minutes=45)
            res_vip.check_out_time = now_utc + timedelta(days=2)

        # Create active cleaning task on room 2 (Room 406)
        task_vip = OperationalTaskEntity(
            id=uuid4(),
            room_id=2,  # Room 406
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=180,
            priority_level="URGENT",
            status=TaskStatus.ASSIGNED.value,
            created_at=now_utc,
        )
        session.add(task_vip)
        session.commit()

    res = client.get("/api/housekeeping/board")
    assert res.status_code == 200
    data = res.json()

    # 1. Overdue summary
    assert data["summary"]["overdue"]["count"] >= 1
    assert "405" in data["summary"]["overdue"]["rooms"]

    # 2. Priority rooms summary (Room 406 has VIP guest arriving in 45m)
    assert data["summary"]["priority_rooms"]["count"] >= 1
    p_rooms = [r["room_number"] for r in data["summary"]["priority_rooms"]["rooms"]]
    assert "406" in p_rooms

    # 3. Check card VIP and next guest fields for room 406
    all_cards = [c for col in data["columns"] for c in col["cards"]]
    vip_card = next((c for c in all_cards if c.get("room_number") == "406"), None)
    assert vip_card is not None
    assert vip_card["is_vip"] is True
    assert vip_card["next_guest"] is not None
    assert "Amit" in vip_card["next_guest"]["name"]
    assert vip_card["next_guest"]["is_vip"] is True

