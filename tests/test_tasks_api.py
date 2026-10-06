import pytest
from fastapi.testclient import TestClient

from app.database.seed import seed_db
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    """Reset system state before each test run."""
    client.post("/api/reset")


def test_tasks_list_rich_metadata_fields():
    # 1. Trigger a checkout so there is at least one active cleaning task
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

    # 2. Report a maintenance issue so there is an active maintenance task
    maint_res = client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 2,
            "reported_by_staff_id": 201,
            "category": "HVAC",
            "severity": "HIGH",
            "description": "AC is making loud vibration noise",
        },
    )
    assert maint_res.status_code == 202

    # 3. Query GET /api/tasks
    res = client.get("/api/tasks")
    assert res.status_code == 200
    tasks = res.json()
    assert isinstance(tasks, list)
    assert len(tasks) >= 2

    # Verify sorting: priority_score descending
    scores = [t["priority_score"] for t in tasks]
    assert scores == sorted(scores, reverse=True)

    cleaning_tasks = [t for t in tasks if t["task_type"] == "ROOM_CLEANING"]
    maint_tasks = [t for t in tasks if t["task_type"] == "ROOM_MAINTENANCE"]

    assert len(cleaning_tasks) >= 1
    assert len(maint_tasks) >= 1

    # Verify cleaning task fields
    ct = cleaning_tasks[0]
    assert ct["display_id"].startswith("HK-")
    assert len(ct["display_id"]) == 7  # e.g. HK-0001
    assert ct["type_label"] == "Cleaning"
    assert "room_number" in ct
    assert "floor" in ct
    assert ct["priority_label"] in ("Critical", "High", "Medium", "Low")
    assert ct["status"] in ("PENDING", "ASSIGNED", "IN_PROGRESS", "ON_HOLD")
    assert ct["status_label"] in ("Pending", "Assigned", "Cleaning", "On hold")
    assert ct["created_at"] is not None
    assert ct["sla_minutes"] is None
    assert ct["sla_deadline"] is None
    assert ct["incident_category"] is None

    # Verify maintenance task fields
    mt = maint_tasks[0]
    assert mt["display_id"].startswith("MT-")
    assert len(mt["display_id"]) == 7  # e.g. MT-0001
    assert mt["type_label"] == "Maintenance"
    assert mt["description"] == "AC is making loud vibration noise"
    assert mt["incident_category"] == "HVAC"
    assert mt["incident_severity"] == "HIGH"
    assert mt["sla_minutes"] == 30
    assert mt["sla_deadline"] is not None
    assert mt["status"] in ("PENDING", "ASSIGNED", "IN_PROGRESS", "ON_HOLD")


def test_tasks_query_filters():
    # Setup cleaning task on room 1 (floor 4) and maintenance task on room 2 (floor 4)
    client.post(
        "/api/events/checkout",
        json={
            "property_id": 1,
            "room_id": 1,
            "reservation_id": 5001,
            "checkout_time": "2026-10-05T12:00:00",
        },
    )
    client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 2,
            "reported_by_staff_id": 201,
            "category": "PLUMBING",
            "severity": "CRITICAL",
            "description": "Geyser valve broken and spraying water",
        },
    )

    # 1. Filter by type=cleaning
    res_clean = client.get("/api/tasks?type=cleaning")
    assert res_clean.status_code == 200
    for t in res_clean.json():
        assert t["task_type"] == "ROOM_CLEANING"

    # 2. Filter by type=maintenance
    res_maint = client.get("/api/tasks?type=maintenance")
    assert res_maint.status_code == 200
    for t in res_maint.json():
        assert t["task_type"] == "ROOM_MAINTENANCE"

    # 3. Filter by floor
    res_floor = client.get("/api/tasks?floor=4")
    assert res_floor.status_code == 200
    for t in res_floor.json():
        assert t["floor"] == 4

    # 4. Filter by search (description or display ID or room number)
    res_search = client.get("/api/tasks?search=Geyser")
    assert res_search.status_code == 200
    assert len(res_search.json()) >= 1
    assert "Geyser" in res_search.json()[0]["description"]

    # 5. Filter by room number
    res_room = client.get("/api/tasks?search=406")
    assert res_room.status_code == 200
    assert any(t["room_number"] == "406" for t in res_room.json())


def test_tasks_summary_endpoint():
    # Create cleaning and maintenance tasks
    client.post(
        "/api/events/checkout",
        json={
            "property_id": 1,
            "room_id": 1,
            "reservation_id": 5001,
            "checkout_time": "2026-10-05T12:00:00",
        },
    )
    client.post(
        "/api/events/maintenance-issue",
        json={
            "room_id": 2,
            "reported_by_staff_id": 201,
            "category": "ELECTRICAL",
            "severity": "HIGH",
            "description": "Sparking plug socket",
        },
    )

    res = client.get("/api/tasks/summary")
    assert res.status_code == 200
    summary = res.json()

    assert "total" in summary
    assert "open_count" in summary
    assert "assigned_count" in summary
    assert "by_type" in summary
    assert "by_priority" in summary

    assert summary["open_count"] >= 2
    assert summary["by_type"]["cleaning"] >= 1
    assert summary["by_type"]["maintenance"] >= 1
    assert isinstance(summary["by_priority"]["high"], int)


def test_tasks_board_endpoint_alias():
    res = client.get("/api/tasks/board")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
