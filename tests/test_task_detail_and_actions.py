import pytest
from datetime import datetime, timezone
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.config import settings
from app.database import SessionLocal, RoomEntity, StaffEntity, OperationalTaskEntity, MaintenanceIncidentEntity
from app.main import app
from app.models.enums import RoomStatus, TaskStatus, TaskType, StaffRole, MaintenanceCategory, MaintenanceSeverity
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

client = TestClient(app)
repo = PostgresHotelRepository()


def test_task_detail_cleaning_task():
    """Verify GET /api/tasks/{id}/detail returns complete drawer structure for a cleaning task."""
    # 1. Create a cleaning task
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        staff = session.execute(select(StaffEntity).where(StaffEntity.id == 201)).scalar_one()
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=80,
            priority_level="HIGH",
            status=TaskStatus.ASSIGNED.value,
            assigned_staff_id=staff.id,
            notes="Standard cleaning for suite room",
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)

    # 2. Call detail endpoint
    resp = client.get(f"/api/tasks/{task_id}/detail")
    assert resp.status_code == 200
    data = resp.json()

    assert data["id"] == task_id
    assert data["display_id"].startswith("HK-")
    assert data["type_label"] == "Cleaning"
    assert data["status"] == "ASSIGNED"
    assert data["status_label"] == "Assigned"
    assert data["priority_level"] == "HIGH"
    assert data["priority_label"] == "High"
    assert data["ai_assigned"] is True
    assert data["assigned_by"] == "Housekeeping Agent"
    assert data["room"]["number"] == "405"
    assert data["room"]["type"] == "DELUXE"
    assert data["room"]["floor"] == 4
    assert data["expected_minutes"] == 45
    assert data["created_at"] is not None
    assert data["started_at"] is None
    assert data["elapsed_minutes"] is None
    assert data["assigned_staff"]["id"] == 201
    assert data["assigned_staff"]["name"] == "Priya Deshmukh"
    assert isinstance(data["activity"], list)
    assert "start" in data["allowed_actions"]
    assert "block" in data["allowed_actions"]
    assert "escalate" in data["allowed_actions"]
    assert "cancel" in data["allowed_actions"]
    assert "reassign" in data["allowed_actions"]
    assert "priority" in data["allowed_actions"]


def test_task_detail_maintenance_task():
    """Verify GET /api/tasks/{id}/detail returns complete drawer structure for a maintenance task with SLA."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "406")).scalar_one()
        staff = session.execute(select(StaffEntity).where(StaffEntity.id == 301)).scalar_one()
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_MAINTENANCE.value,
            priority_score=100,
            priority_level="URGENT",
            status=TaskStatus.ASSIGNED.value,
            assigned_staff_id=staff.id,
            notes="AC unit not cooling and emitting heat",
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.flush()

        incident = MaintenanceIncidentEntity(
            room_id=room.id,
            reported_by_staff_id=201,
            description="AC unit not cooling and emitting heat",
            category=MaintenanceCategory.HVAC.value,
            severity=MaintenanceSeverity.CRITICAL.value,
            affects_room_readiness=True,
            status="ASSIGNED",
            assigned_technician_id=staff.id,
            sla_minutes=15,
            operational_task_id=task.id,
            created_at=datetime.now(timezone.utc),
        )
        session.add(incident)
        session.commit()
        task_id = str(task.id)

    resp = client.get(f"/api/tasks/{task_id}/detail")
    assert resp.status_code == 200
    data = resp.json()

    assert data["id"] == task_id
    assert data["display_id"].startswith("MT-")
    assert data["type_label"] == "Maintenance"
    assert data["priority_label"] == "Critical"
    assert data["expected_minutes"] == 15
    assert data["incident"] is not None
    assert data["incident"]["category"] == "HVAC"
    assert data["incident"]["severity"] == "CRITICAL"
    assert data["incident"]["sla_minutes"] == 15
    assert data["incident"]["sla_deadline"] is not None


def test_task_start_action_and_room_side_effect():
    """Test POST /api/tasks/{id}/start sets started_at, room to CLEANING, and logs activity."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        room.status = "DIRTY"
        staff = session.execute(select(StaffEntity).where(StaffEntity.id == 201)).scalar_one()
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=50,
            priority_level="STANDARD",
            status=TaskStatus.ASSIGNED.value,
            assigned_staff_id=staff.id,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)
        room_id = room.id

    # Start task
    resp = client.post(f"/api/tasks/{task_id}/start")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "IN_PROGRESS"
    assert data["status_label"] == "Cleaning"
    assert data["started_at"] is not None
    assert "complete" in data["allowed_actions"]
    assert len(data["activity"]) >= 1
    assert data["activity"][0]["title"] == "Cleaning started"
    assert data["activity"][0]["actor_name"] == settings.CURRENT_USER_NAME

    # Check room in DB
    with SessionLocal() as session:
        db_room = session.get(RoomEntity, room_id)
        assert db_room.status == RoomStatus.CLEANING.value


def test_task_block_and_escalate_actions():
    """Test POST /api/tasks/{id}/block and /escalate."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=50,
            priority_level="STANDARD",
            status=TaskStatus.ASSIGNED.value,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)

    # 1. Block
    block_resp = client.post(f"/api/tasks/{task_id}/block", json={"reason": "Guest in room / DND"})
    assert block_resp.status_code == 200
    block_data = block_resp.json()
    assert block_data["status"] == "ON_HOLD"
    assert block_data["status_label"] == "Blocked"
    assert block_data["activity"][0]["title"] == "Task blocked"
    assert block_data["activity"][0]["outcome"] == "Guest in room / DND"

    # 2. Escalate
    esc_resp = client.post(f"/api/tasks/{task_id}/escalate", json={"note": "VIP guest requesting early checkin"})
    assert esc_resp.status_code == 200
    esc_data = esc_resp.json()
    assert esc_data["activity"][0]["title"] == "Escalation"
    assert esc_data["activity"][0]["outcome"] == "VIP guest requesting early checkin"


def test_task_priority_change_human_override():
    """Test PATCH /api/tasks/{id}/priority writes human override activity."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=20,
            priority_level="NORMAL",
            status=TaskStatus.ASSIGNED.value,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)

    resp = client.patch(f"/api/tasks/{task_id}/priority", json={"priority": "HIGH"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["priority_level"] == "HIGH"
    assert data["priority_label"] == "High"
    assert data["priority_score"] == 80
    assert data["activity"][0]["title"] == "Human override"
    assert data["activity"][0]["actor_name"] == settings.CURRENT_USER_NAME


def test_task_reassign_and_assignable_staff():
    """Test GET assignable-staff and POST reassign."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        staff_201 = session.get(StaffEntity, 201)
        staff_201.active_task_count = 1
        staff_201.is_available = False

        staff_202 = session.get(StaffEntity, 202)
        staff_202.active_task_count = 0
        staff_202.is_available = True

        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=50,
            priority_level="STANDARD",
            status=TaskStatus.ASSIGNED.value,
            assigned_staff_id=201,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)

    # Check assignable staff list
    st_resp = client.get(f"/api/tasks/{task_id}/assignable-staff")
    assert st_resp.status_code == 200
    st_data = st_resp.json()
    assert len(st_data) >= 2
    assert any(s["id"] == 202 for s in st_data)

    # Reassign to 202
    reassign_resp = client.post(f"/api/tasks/{task_id}/reassign", json={"staff_id": 202})
    assert reassign_resp.status_code == 200
    reassign_data = reassign_resp.json()
    assert reassign_data["assigned_staff"]["id"] == 202
    assert reassign_data["ai_assigned"] is False
    assert reassign_data["activity"][0]["title"] == "Cleaner reassigned"
    assert "201" in reassign_data["activity"][0]["action"] or "Priya" in reassign_data["activity"][0]["action"]

    # Verify staff workloads in DB
    with SessionLocal() as session:
        s201 = session.get(StaffEntity, 201)
        s202 = session.get(StaffEntity, 202)
        assert s201.active_task_count == 0
        assert s201.is_available is True
        assert s202.active_task_count == 1
        assert s202.is_available is False


def test_task_cancel_action():
    """Test POST /api/tasks/{id}/cancel releases staff and updates room."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        room.status = "CLEANING"
        staff = session.get(StaffEntity, 201)
        staff.active_task_count = 1
        staff.is_available = False

        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=50,
            priority_level="STANDARD",
            status=TaskStatus.IN_PROGRESS.value,
            assigned_staff_id=201,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)
        room_id = room.id

    resp = client.post(f"/api/tasks/{task_id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "CANCELLED"
    assert data["status_label"] == "Cancelled"
    assert data["allowed_actions"] == []

    # Check staff and room in DB
    with SessionLocal() as session:
        s = session.get(StaffEntity, 201)
        assert s.active_task_count == 0
        assert s.is_available is True
        r = session.get(RoomEntity, room_id)
        assert r.status == RoomStatus.DIRTY.value


def test_disallowed_action_returns_409():
    """Verify that calling an invalid action for current status returns 409 and leaves data unchanged."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=50,
            priority_level="STANDARD",
            status=TaskStatus.COMPLETED.value,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)

    # Trying to start a completed task
    resp = client.post(f"/api/tasks/{task_id}/start")
    assert resp.status_code == 409
    assert "cannot start" in resp.json()["detail"].lower() or "completed" in resp.json()["detail"].lower()

    # Trying to reassign a completed task
    reassign_resp = client.post(f"/api/tasks/{task_id}/reassign", json={"staff_id": 201})
    assert reassign_resp.status_code == 409


def test_unknown_task_returns_404():
    """Verify 404 for unknown task ID."""
    random_id = str(uuid4())
    resp = client.get(f"/api/tasks/{random_id}/detail")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()

    resp_start = client.post(f"/api/tasks/{random_id}/start")
    assert resp_start.status_code == 404


def test_reassign_invalid_staff_rollback():
    """Verify that if reassign fails halfway (e.g. staff not found or wrong role), entire transaction rolls back."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        staff = session.get(StaffEntity, 201)
        staff.active_task_count = 1
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=50,
            priority_level="STANDARD",
            status=TaskStatus.ASSIGNED.value,
            assigned_staff_id=201,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)

    # Reassign to maintenance staff ID 301 for cleaning task (role mismatch)
    resp = client.post(f"/api/tasks/{task_id}/reassign", json={"staff_id": 301})
    assert resp.status_code == 409

    # Verify task and staff are unchanged in DB
    with SessionLocal() as session:
        t = session.get(OperationalTaskEntity, task_id)
        assert t.assigned_staff_id == 201
        s = session.get(StaffEntity, 201)
        assert s.active_task_count == 1


def test_activity_timeline_ordering():
    """Verify activity events are returned newest first."""
    with SessionLocal() as session:
        room = session.execute(select(RoomEntity).where(RoomEntity.room_number == "405")).scalar_one()
        task = OperationalTaskEntity(
            room_id=room.id,
            task_type=TaskType.ROOM_CLEANING.value,
            priority_score=50,
            priority_level="STANDARD",
            status=TaskStatus.ASSIGNED.value,
            created_at=datetime.now(timezone.utc),
        )
        session.add(task)
        session.commit()
        task_id = str(task.id)

    # 1. Start
    client.post(f"/api/tasks/{task_id}/start")
    # 2. Priority change
    client.patch(f"/api/tasks/{task_id}/priority", json={"priority": "HIGH"})
    # 3. Escalate
    client.post(f"/api/tasks/{task_id}/escalate", json={"note": "VIP note"})

    resp = client.get(f"/api/tasks/{task_id}/detail")
    assert resp.status_code == 200
    activities = resp.json()["activity"]
    assert len(activities) >= 3
    # Newest action was escalate
    assert activities[0]["title"] == "Escalation"
    assert activities[1]["title"] == "Human override"
    assert activities[2]["title"] == "Cleaning started"


def test_checkout_flow_generates_full_activity_timeline():
    """Verify that real checkout event creates a task with checkout, room status change, creation, and assignment activity events."""
    # Ensure room 1 is OCCUPIED
    with SessionLocal() as session:
        r1 = session.get(RoomEntity, 1)
        r1.status = "OCCUPIED"
        session.commit()

    checkout_payload = {
        "event_id": str(uuid4()),
        "property_id": 1,
        "room_id": 1,
        "reservation_id": 5001,
        "checkout_time": datetime.now(timezone.utc).isoformat(),
    }

    res = client.post("/api/events/checkout", json=checkout_payload)
    assert res.status_code == 202
    data = res.json()
    task_id = data["housekeeping"]["task_id"]
    assert task_id is not None

    # Fetch task detail
    detail_res = client.get(f"/api/tasks/{task_id}/detail")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    activities = detail["activity"]
    assert len(activities) >= 4
    titles = [a["title"] for a in activities]
    assert "Guest checkout received" in titles
    assert "Room status changed" in titles
    assert "Task created" in titles
    assert "Cleaner assigned" in titles
