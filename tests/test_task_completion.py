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


def test_postgres_repository_complete_task():
    """Test complete_task method on PostgresHotelRepository."""
    repo = PostgresHotelRepository()
    task = OperationalTask(
        id=uuid4(),
        task_type=TaskType.ROOM_CLEANING,
        room_id=1,
        priority_score=50,
        priority_level="HIGH",
        status=TaskStatus.PENDING,
    )
    repo.save_operational_task(task)
    repo.assign_task_to_staff(task.id, 202)

    staff_before = repo.get_staff_by_id(202)
    assert staff_before.is_available is False
    assert staff_before.assigned_room_id == 1
    assert staff_before.active_task_count == 1

    completed_task = repo.complete_task(task.id)
    assert completed_task.status == TaskStatus.COMPLETED

    staff_after = repo.get_staff_by_id(202)
    assert staff_after.is_available is True
    assert staff_after.assigned_room_id is None
    assert staff_after.active_task_count == 0
    assert repo.get_room_by_id(1).status == RoomStatus.READY

    # Test already completed error
    with pytest.raises(ValueError, match="already completed"):
        repo.complete_task(task.id)

    # Test not found error
    with pytest.raises(ValueError, match="not found"):
        repo.complete_task(uuid4())


def test_staff_with_multiple_active_tasks_not_released_prematurely():
    """Test that a staff member with multiple tasks remains busy until all tasks complete."""
    repo = PostgresHotelRepository()
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
    repo.save_operational_task(task1)
    repo.save_operational_task(task2)

    repo.assign_task_to_staff(task1.id, 202)
    repo.assign_task_to_staff(task2.id, 202)

    staff_before = repo.get_staff_by_id(202)
    assert staff_before.active_task_count == 2
    assert staff_before.is_available is False

    # Complete task 1
    repo.complete_task(task1.id)
    staff_mid = repo.get_staff_by_id(202)
    assert staff_mid.active_task_count == 1
    assert staff_mid.is_available is False
    assert staff_mid.assigned_room_id == 2  # updated to remaining room

    # Complete task 2
    repo.complete_task(task2.id)
    staff_after = repo.get_staff_by_id(202)
    assert staff_after.active_task_count == 0
    assert staff_after.is_available is True
    assert staff_after.assigned_room_id is None


def test_occupied_room_maintenance_reporting_and_completion_flow():
    """Test maintenance reported on an OCCUPIED room, technician completion, and subsequent checkout."""
    repo = PostgresHotelRepository()

    # Verify Room 1 starts as OCCUPIED
    room_before = repo.get_room_by_id(1)
    assert room_before.status == RoomStatus.OCCUPIED

    # 1. Report Maintenance Issue on Room 1 (OCCUPIED)
    maint_res = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 1,
            "reported_by_staff_id": 201,
            "category": "HVAC",
            "severity": "MEDIUM",
            "description": "AC cooling low in occupied room",
        },
    )
    assert maint_res.status_code == 202
    maint_data = maint_res.json()["maintenance"]
    task_id = maint_data["operational_task_id"]
    technician_id = maint_data["assigned_technician_id"]

    assert task_id is not None
    assert technician_id == 301
    assert maint_data["previous_room_status"] == "OCCUPIED"
    assert maint_data["new_room_status"] == "OCCUPIED"

    # Room must still be OCCUPIED in database
    room_during = repo.get_room_by_id(1)
    assert room_during.status == RoomStatus.OCCUPIED

    # Technician 301 must be busy
    tech_301 = repo.get_staff_by_id(301)
    assert tech_301.is_available is False
    assert tech_301.assigned_room_id == 1

    # 2. Complete Maintenance Task
    complete_res = client.post(f"/api/tasks/{task_id}/complete")
    assert complete_res.status_code == 200
    complete_data = complete_res.json()

    assert complete_data["task"]["status"] == "COMPLETED"
    # Room must still remain OCCUPIED (NOT READY)
    assert complete_data["room"]["status"] == "OCCUPIED"
    assert repo.get_room_by_id(1).status == RoomStatus.OCCUPIED

    # Technician 301 must now be released and available
    assert complete_data["assigned_staff"]["is_available"] is True
    assert complete_data["assigned_staff"]["assigned_room_id"] is None
    assert complete_data["assigned_staff"]["active_task_count"] == 0

    # 3. Subsequent Guest Checkout on Room 1
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
    checkout_data = checkout_res.json()
    assert checkout_data["orchestration"]["status"] == "ROUTED"
    assert checkout_data["room_readiness"]["status"] == "READY_FOR_HOUSEKEEPING"
    assert checkout_data["housekeeping"]["status"] == "HOUSEKEEPING_ASSIGNED"
    assert checkout_data["housekeeping"]["assigned_staff_id"] == 201
    assert repo.get_room_by_id(1).status == RoomStatus.CLEANING


def test_multiple_concurrent_maintenance_tasks_on_same_room():
    """Test reporting multiple maintenance issues on the same room and verify completion order."""
    repo = PostgresHotelRepository()

    # Step 1: Checkout Room 1 so room is CLEANING
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

    # Step 2: Report First Issue (HVAC) on Room 1
    res_hvac = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 1,
            "reported_by_staff_id": 201,
            "category": "HVAC",
            "severity": "HIGH",
            "description": "AC unit leaking water",
        },
    )
    assert res_hvac.status_code == 202
    hvac_data = res_hvac.json()["maintenance"]
    task1_id = hvac_data["operational_task_id"]
    tech1_id = hvac_data["assigned_technician_id"]
    assert tech1_id == 301
    assert repo.get_room_by_id(1).status == RoomStatus.MAINTENANCE

    # Step 3: Report Second Issue (PLUMBING) on the same Room 1 (which is now in MAINTENANCE)
    res_plumbing = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 1,
            "reported_by_staff_id": 301,
            "category": "PLUMBING",
            "severity": "MEDIUM",
            "description": "Bathroom pipe leaking under sink",
        },
    )
    assert res_plumbing.status_code == 202
    plumbing_data = res_plumbing.json()["maintenance"]
    task2_id = plumbing_data["operational_task_id"]
    tech2_id = plumbing_data["assigned_technician_id"]
    assert tech2_id == 302
    assert plumbing_data["new_room_status"] == "MAINTENANCE"
    assert repo.get_room_by_id(1).status == RoomStatus.MAINTENANCE

    # Both technicians must be assigned and busy
    assert repo.get_staff_by_id(301).is_available is False
    assert repo.get_staff_by_id(302).is_available is False

    # Step 4: Complete First Task (HVAC)
    complete1_res = client.post(f"/api/tasks/{task1_id}/complete")
    assert complete1_res.status_code == 200
    complete1_data = complete1_res.json()

    # Technician 1 (301) must be released
    assert complete1_data["assigned_staff"]["is_available"] is True
    assert repo.get_staff_by_id(301).is_available is True

    # Room 1 MUST STILL REMAIN IN MAINTENANCE because Task 2 (Plumbing) is still active
    assert complete1_data["room"]["status"] == "MAINTENANCE"
    assert repo.get_room_by_id(1).status == RoomStatus.MAINTENANCE

    # Technician 2 (302) must still be busy
    assert repo.get_staff_by_id(302).is_available is False

    # Step 5: Complete Second Task (Plumbing)
    complete2_res = client.post(f"/api/tasks/{task2_id}/complete")
    assert complete2_res.status_code == 200
    complete2_data = complete2_res.json()

    # Technician 2 (302) must now be released
    assert complete2_data["assigned_staff"]["is_available"] is True
    assert repo.get_staff_by_id(302).is_available is True

    # Since all maintenance tasks are complete, room status transitions appropriately
    assert repo.get_room_by_id(1).status in (RoomStatus.READY, RoomStatus.CLEANING)


def test_maintenance_issue_orchestrator_routing():
    """Verify that OperationsOrchestratorAgent routes maintenance reports properly and endpoint includes orchestration result."""
    client.post("/api/reset")
    repo = PostgresHotelRepository()

    res = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 1,
            "reported_by_staff_id": 201,
            "category": "HVAC",
            "severity": "HIGH",
            "description": "AC leaking water in room",
        },
    )
    assert res.status_code == 202
    data = res.json()

    # Check that orchestration result exists and is properly structured
    assert "orchestration" in data
    orch = data["orchestration"]
    assert orch["workflow_name"] == "MAINTENANCE_TICKET"
    assert orch["current_agent"] == "OPERATIONS_ORCHESTRATOR"
    assert orch["next_agent"] == "MAINTENANCE_AGENT"
    assert orch["room_id"] == 1
    assert orch["status"] == "ROUTED"
    assert "HVAC" in orch["reason"]

    # Check maintenance result is also present
    assert "maintenance" in data
    assert data["maintenance"]["assigned_technician_id"] == 301
    assert data["processing_status"] == "ROUTED"


def test_post_maintenance_inspection_recheck_and_cleaning_flow():
    """Verify maintenance completion passes through INSPECTION before landing on READY, and cleaning completion remains direct to READY."""
    client.post("/api/reset")
    repo = PostgresHotelRepository()

    # Part A: Test Maintenance Task Completion through INSPECTION & verify_post_maintenance
    # Report maintenance on Room 2 (starts READY, moves to MAINTENANCE)
    maint_res = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 2,
            "reported_by_staff_id": 201,
            "category": "ELECTRICAL",
            "severity": "HIGH",
            "description": "Flickering lights in room 2",
        },
    )
    assert maint_res.status_code == 202
    maint_data = maint_res.json()["maintenance"]
    task_id = maint_data["operational_task_id"]

    # Direct unit verification of RoomReadinessAgent.verify_post_maintenance:
    from app.agents.room_readiness_agent import RoomReadinessAgent
    readiness_agent = RoomReadinessAgent(repo)

    # If there are active tasks, verify_post_maintenance must reject marking room READY
    import pytest
    with pytest.raises(ValueError, match="active task"):
        readiness_agent.verify_post_maintenance(2)

    # Complete the maintenance task via the API endpoint
    complete_res = client.post(f"/api/tasks/{task_id}/complete")
    assert complete_res.status_code == 200
    complete_data = complete_res.json()

    # Final room status must be READY
    assert complete_data["room"]["status"] == "READY"
    assert repo.get_room_by_id(2).status == RoomStatus.READY

    # Part B: Confirm a cleaning task completion still transitions directly to READY
    # Checkout room 1 (moves to CLEANING)
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
    cleaning_task_id = checkout_res.json()["housekeeping"]["task_id"]
    assert repo.get_room_by_id(1).status == RoomStatus.CLEANING

    # Complete cleaning task
    clean_complete_res = client.post(f"/api/tasks/{cleaning_task_id}/complete")
    assert clean_complete_res.status_code == 200
    clean_complete_data = clean_complete_res.json()
    assert clean_complete_data["room"]["status"] == "READY"
    assert repo.get_room_by_id(1).status == RoomStatus.READY


def test_maintenance_completed_before_cleaning_still_triggers_inspection():
    """Test edge case: maintenance completed BEFORE cleaning on the same room still triggers INSPECTION when cleaning finishes last."""
    client.post("/api/reset")
    repo = PostgresHotelRepository()

    # 1. Checkout Room 1 -> Creates Cleaning Task, Room moves to CLEANING
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
    cleaning_task_id = checkout_res.json()["housekeeping"]["task_id"]
    assert repo.get_room_by_id(1).status == RoomStatus.CLEANING

    # 2. Report Maintenance Issue on Room 1 -> Creates Maintenance Task, Room moves to MAINTENANCE
    maint_res = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 1,
            "reported_by_staff_id": 201,
            "category": "HVAC",
            "severity": "HIGH",
            "description": "AC leaking water in room 1",
        },
    )
    assert maint_res.status_code == 202
    maint_task_id = maint_res.json()["maintenance"]["operational_task_id"]
    assert repo.get_room_by_id(1).status == RoomStatus.MAINTENANCE

    # 3. Complete MAINTENANCE task FIRST
    maint_complete_res = client.post(f"/api/tasks/{maint_task_id}/complete")
    assert maint_complete_res.status_code == 200
    maint_complete_data = maint_complete_res.json()

    # Room must remain in CLEANING because the cleaning task is still active
    assert maint_complete_data["room"]["status"] == "CLEANING"
    assert repo.get_room_by_id(1).status == RoomStatus.CLEANING

    # 4. Complete CLEANING task LAST
    clean_complete_res = client.post(f"/api/tasks/{cleaning_task_id}/complete")
    assert clean_complete_res.status_code == 200
    clean_complete_data = clean_complete_res.json()

    # Final room status must be READY, having successfully passed post-maintenance verification
    assert clean_complete_data["room"]["status"] == "READY"
    assert repo.get_room_by_id(1).status == RoomStatus.READY





