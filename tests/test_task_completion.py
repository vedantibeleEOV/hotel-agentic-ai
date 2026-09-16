import uuid
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.enums import (
    IncidentStatus,
    MaintenanceCategory,
    MaintenanceSeverity,
    MaintenanceSkill,
    RoomStatus,
    StaffRole,
    TaskStatus,
    TaskType,
)
from app.models.maintenance_incident import MaintenanceIncident
from app.models.operational_task import OperationalTask
from app.models.staff import Staff
from app.repositories.mock_hotel_repository import MockHotelRepository
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    """Reset database before each test."""
    client.post("/api/reset")


def test_complete_housekeeping_task_via_api():
    """Test full checkout -> housekeeping assignment -> task completion flow via API."""
    # 1. Trigger Checkout Event for Room 1 (Room 405)
    checkout_res = client.post(
        "/api/events/checkout",
        json={
            "property_id": 1,
            "room_id": 1,
            "reservation_id": 5001,
            "checkout_time": "2026-08-29T10:00:00",
        },
    )
    assert checkout_res.status_code == 202
    hk_data = checkout_res.json()["housekeeping"]
    task_id = hk_data["task_id"]
    assigned_staff_id = hk_data["assigned_staff_id"]
    assert task_id is not None
    assert assigned_staff_id == 201

    # Check staff before completion
    repo = PostgresHotelRepository()
    staff_201 = repo.get_staff_by_id(201)
    assert staff_201.is_available is False
    assert staff_201.assigned_room_id == 1
    assert staff_201.active_task_count == 1

    # Check room before completion
    room_1 = repo.get_room_by_id(1)
    assert room_1.status == RoomStatus.CLEANING

    # 2. Complete Task via API
    complete_res = client.post(f"/api/tasks/{task_id}/complete")
    assert complete_res.status_code == 200
    complete_data = complete_res.json()
    assert complete_data["message"] == "Task completed successfully"
    assert complete_data["task"]["status"] == "COMPLETED"
    assert complete_data["room"]["status"] == "READY"
    assert complete_data["assigned_staff"]["is_available"] is True
    assert complete_data["assigned_staff"]["assigned_room_id"] is None
    assert complete_data["assigned_staff"]["active_task_count"] == 0

    # Verify repository state after completion
    after_staff = repo.get_staff_by_id(201)
    assert after_staff.is_available is True
    assert after_staff.assigned_room_id is None
    assert after_staff.active_task_count == 0
    assert repo.get_room_by_id(1).status == RoomStatus.READY


def test_complete_maintenance_task_via_api():
    """Test maintenance issue -> incident assignment -> task completion flow via API."""
    # First set Room 1 to CLEANING via checkout
    client.post(
        "/api/events/checkout",
        json={
            "property_id": 1,
            "room_id": 1,
            "reservation_id": 5001,
            "checkout_time": "2026-08-29T10:00:00",
        },
    )

    # Report maintenance issue for Room 1
    maint_res = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 1,
            "reported_by_staff_id": 201,
            "category": "HVAC",
            "severity": "HIGH",
            "description": "AC unit leaking water",
        },
    )
    assert maint_res.status_code == 202
    maint_data = maint_res.json()["maintenance"]
    task_id = maint_data["operational_task_id"]
    technician_id = maint_data["assigned_technician_id"]
    assert task_id is not None
    assert technician_id == 301

    # Check technician before completion
    repo = PostgresHotelRepository()
    tech_301 = repo.get_staff_by_id(301)
    assert tech_301.is_available is False
    assert tech_301.assigned_room_id == 1


    # Complete maintenance task
    complete_res = client.post(f"/api/tasks/{task_id}/complete")
    assert complete_res.status_code == 200
    complete_data = complete_res.json()
    assert complete_data["task"]["status"] == "COMPLETED"
    assert complete_data["assigned_staff"]["is_available"] is True
    assert complete_data["assigned_staff"]["assigned_room_id"] is None
    assert complete_data["assigned_staff"]["active_task_count"] == 0


def test_complete_task_not_found_404():
    """Test 404 response when completing a non-existent task."""
    random_uuid = uuid4()
    res = client.post(f"/api/tasks/{random_uuid}/complete")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_complete_task_already_completed_409():
    """Test 409 conflict when attempting to complete an already completed task."""
    # Create task via checkout
    checkout_res = client.post(
        "/api/events/checkout",
        json={
            "property_id": 1,
            "room_id": 1,
            "reservation_id": 5001,
            "checkout_time": "2026-08-29T10:00:00",
        },
    )
    task_id = checkout_res.json()["housekeeping"]["task_id"]

    # First completion -> 200
    res1 = client.post(f"/api/tasks/{task_id}/complete")
    assert res1.status_code == 200

    # Second completion -> 409
    res2 = client.post(f"/api/tasks/{task_id}/complete")
    assert res2.status_code == 409
    assert "already completed" in res2.json()["detail"].lower()


def test_mock_repository_complete_task():
    """Test complete_task method on MockHotelRepository."""
    mock_repo = MockHotelRepository()
    task = OperationalTask(
        id=uuid4(),
        task_type=TaskType.ROOM_CLEANING,
        room_id=1,
        priority_score=50,
        priority_level="HIGH",
        status=TaskStatus.PENDING,
    )
    mock_repo.save_operational_task(task)
    mock_repo.assign_task_to_staff(task.id, 202)

    staff_before = mock_repo.staff[202]
    assert staff_before.is_available is False
    assert staff_before.assigned_room_id == 1
    assert staff_before.active_task_count == 1

    completed_task = mock_repo.complete_task(task.id)
    assert completed_task.status == TaskStatus.COMPLETED

    staff_after = mock_repo.staff[202]
    assert staff_after.is_available is True
    assert staff_after.assigned_room_id is None
    assert staff_after.active_task_count == 0
    assert mock_repo.rooms[1].status == RoomStatus.READY

    # Test already completed error
    with pytest.raises(ValueError, match="already completed"):
        mock_repo.complete_task(task.id)

    # Test not found error
    with pytest.raises(ValueError, match="not found"):
        mock_repo.complete_task(uuid4())


def test_staff_with_multiple_active_tasks_not_released_prematurely():
    """Test that a staff member with multiple tasks remains busy until all tasks complete."""
    mock_repo = MockHotelRepository()
    task1 = OperationalTask(
        id=uuid4(),
        task_type=TaskType.ROOM_CLEANING,
        room_id=1,
        priority_score=50,
        priority_level="HIGH",
        status=TaskStatus.PENDING,
    )
    task2 = OperationalTask(
        id=uuid4(),
        task_type=TaskType.ROOM_CLEANING,
        room_id=2,
        priority_score=50,
        priority_level="HIGH",
        status=TaskStatus.PENDING,
    )
    mock_repo.save_operational_task(task1)
    mock_repo.save_operational_task(task2)

    mock_repo.assign_task_to_staff(task1.id, 202)
    mock_repo.assign_task_to_staff(task2.id, 202)

    assert mock_repo.staff[202].active_task_count == 2
    assert mock_repo.staff[202].is_available is False

    # Complete task 1
    mock_repo.complete_task(task1.id)
    assert mock_repo.staff[202].active_task_count == 1
    assert mock_repo.staff[202].is_available is False
    assert mock_repo.staff[202].assigned_room_id == 2  # updated to remaining room

    # Complete task 2
    mock_repo.complete_task(task2.id)
    assert mock_repo.staff[202].active_task_count == 0
    assert mock_repo.staff[202].is_available is True
    assert mock_repo.staff[202].assigned_room_id is None
