import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.seed import seed_db
from app.repositories.postgres_hotel_repository import PostgresHotelRepository
from app.models.enums import RoomStatus, MaintenanceCategory

client = TestClient(app)


def test_e2e_maintenance_scenarios():
    # 0. Initialize / Seed DB to clean state
    seed_db()
    repo = PostgresHotelRepository()

    print("\n" + "=" * 80)
    print("STARTING E2E VERIFICATION FOR POST /api/events/maintenance-issue")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # Scenario 1: VALID MAINTENANCE ISSUE ("AC is not cooling")
    # -------------------------------------------------------------------------
    print("\n[Scenario 1: VALID MAINTENANCE ISSUE]")
    room_2 = repo.get_room_by_id(2)
    status_2_before = room_2.status
    incidents_before = len(repo.maintenance_incidents)
    print(f"  Before -> Room 2 Status: {status_2_before}, Total Incidents: {incidents_before}")

    payload_valid = {
        "room_id": 2,
        "reported_by_staff_id": 201,
        "description": "AC is not cooling",
    }
    resp_valid = client.post("/api/events/maintenance-issue", json=payload_valid)
    print(f"  API Response Status: {resp_valid.status_code}")
    print(f"  API Response JSON: {resp_valid.json()}")

    assert resp_valid.status_code == 202
    data_valid = resp_valid.json()
    assert data_valid["processing_status"] == "ROUTED"
    assert "maintenance" in data_valid
    assert data_valid["maintenance"]["category"] == "HVAC"
    assert data_valid["maintenance"]["assigned_technician_id"] is not None

    room_2_after = repo.get_room_by_id(2)
    incidents_after = len(repo.maintenance_incidents)
    print(f"  After  -> Room 2 Status: {room_2_after.status}, Total Incidents: {incidents_after}")
    assert incidents_after == incidents_before + 1
    assert room_2_after.status == RoomStatus.MAINTENANCE
    print("  Scenario 1: PASS")

    # -------------------------------------------------------------------------
    # Scenario 2: INVALID GIBBERISH ("dd fbhcy bcgd bchdh")
    # -------------------------------------------------------------------------
    print("\n[Scenario 2: INVALID GIBBERISH]")
    room_1_before = repo.get_room_by_id(1)
    status_1_before = room_1_before.status
    incidents_2_before = len(repo.maintenance_incidents)
    staff_workload_before = {s.id: s.active_task_count for s in repo.staff.values()}
    print(f"  Before -> Room 1 Status: {status_1_before}, Total Incidents: {incidents_2_before}")

    payload_gibberish = {
        "room_id": 1,
        "reported_by_staff_id": 201,
        "description": "dd fbhcy bcgd bchdh",
    }
    resp_gibberish = client.post("/api/events/maintenance-issue", json=payload_gibberish)
    print(f"  API Response Status: {resp_gibberish.status_code}")
    print(f"  API Response JSON: {resp_gibberish.json()}")

    assert resp_gibberish.status_code == 400
    assert resp_gibberish.json()["detail"] == "Please provide a valid maintenance issue description."

    room_1_after = repo.get_room_by_id(1)
    incidents_2_after = len(repo.maintenance_incidents)
    staff_workload_after = {s.id: s.active_task_count for s in repo.staff.values()}
    print(f"  After  -> Room 1 Status: {room_1_after.status}, Total Incidents: {incidents_2_after}")

    assert incidents_2_after == incidents_2_before, "Incident count must not change on invalid input"
    assert room_1_after.status == status_1_before, "Room status must not change on invalid input"
    assert staff_workload_after == staff_workload_before, "Staff workload must not change on invalid input"
    print("  Scenario 2: PASS")

    # -------------------------------------------------------------------------
    # Scenario 3: INVALID NON-MAINTENANCE REQUEST ("I need a water bottle")
    # -------------------------------------------------------------------------
    print("\n[Scenario 3: INVALID NON-MAINTENANCE REQUEST]")
    room_1_before = repo.get_room_by_id(1)
    status_1_before = room_1_before.status
    incidents_3_before = len(repo.maintenance_incidents)
    staff_workload_3_before = {s.id: s.active_task_count for s in repo.staff.values()}
    print(f"  Before -> Room 1 Status: {status_1_before}, Total Incidents: {incidents_3_before}")

    payload_non_maint = {
        "room_id": 1,
        "reported_by_staff_id": 201,
        "description": "I need a water bottle",
    }
    resp_non_maint = client.post("/api/events/maintenance-issue", json=payload_non_maint)
    print(f"  API Response Status: {resp_non_maint.status_code}")
    print(f"  API Response JSON: {resp_non_maint.json()}")

    assert resp_non_maint.status_code == 400
    assert resp_non_maint.json()["detail"] == "Please provide a valid maintenance issue description."

    room_1_after = repo.get_room_by_id(1)
    incidents_3_after = len(repo.maintenance_incidents)
    staff_workload_3_after = {s.id: s.active_task_count for s in repo.staff.values()}
    print(f"  After  -> Room 1 Status: {room_1_after.status}, Total Incidents: {incidents_3_after}")

    assert incidents_3_after == incidents_3_before, "Incident count must not change on non-maintenance input"
    assert room_1_after.status == status_1_before, "Room status must not change on non-maintenance input"
    assert staff_workload_3_after == staff_workload_3_before, "Staff workload must not change on non-maintenance input"
    print("  Scenario 3: PASS")

    print("\n" + "=" * 80)
    print("ALL 3 E2E SCENARIOS VERIFIED SUCCESSFULLY")
    print("=" * 80)


if __name__ == "__main__":
    test_e2e_maintenance_scenarios()
