import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.agents.maintenance_agent import MaintenanceAgent
from app.database.orm import StaffEntity
from app.database.seed import seed_db
from app.models.enums import (
    IncidentStatus,
    MaintenanceCategory,
    MaintenanceResultStatus,
    MaintenanceSeverity,
    RoomStatus,
)
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.repositories.postgres_hotel_repository import PostgresHotelRepository


def run_all_tests():
    passed = 0
    total = 10

    # Test 1: Room 1 (floor 4, CLEANING), reported by 202 (housekeeping), HVAC, HIGH
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=202,
            description="AC cooling not working properly",
            category=MaintenanceCategory.HVAC,
            severity=MaintenanceSeverity.HIGH,
        )
        result = agent.report_issue(issue)

        assert result.assigned_technician_id == 301, f"Expected tech 301, got {result.assigned_technician_id}"
        assert result.result_status == MaintenanceResultStatus.MAINTENANCE_ASSIGNED, f"Expected MAINTENANCE_ASSIGNED, got {result.result_status}"
        print("Test 1: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 1: FAIL - {e}")

    # Test 2: Same as Test 1 but CRITICAL severity -> SLA 15, priority score 100
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=202,
            description="AC leaking water heavily onto bed",
            category=MaintenanceCategory.HVAC,
            severity=MaintenanceSeverity.CRITICAL,
        )
        result = agent.report_issue(issue)

        assert result.sla_minutes == 15, f"Expected SLA 15, got {result.sla_minutes}"
        task = repo.get_operational_task_by_id(result.operational_task_id)
        assert task is not None, "Task not found in repository"
        assert task.priority_score == 100, f"Expected priority score 100, got {task.priority_score}"
        print("Test 2: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 2: FAIL - {e}")

    # Test 3: ELECTRICAL, MEDIUM -> Assigned tech 302 (Suresh)
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=202,
            description="Electrical socket loose in bedroom",
            category=MaintenanceCategory.ELECTRICAL,
            severity=MaintenanceSeverity.MEDIUM,
        )
        result = agent.report_issue(issue)

        assert result.assigned_technician_id == 302, f"Expected tech 302, got {result.assigned_technician_id}"
        assert result.assigned_technician_id != 301, "Tech 301 should not be selected"
        print("Test 3: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 3: FAIL - {e}")

    # Test 4: Both staff 301 & 302 unavailable -> WAITING_FOR_TECHNICIAN, None tech, ESCALATED
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        with repo.session_factory() as session:
            for tid in (301, 302):
                s = session.get(StaffEntity, tid)
                if s:
                    s.is_available = False
            session.commit()

        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=202,
            description="HVAC breakdown with no available staff",
            category=MaintenanceCategory.HVAC,
            severity=MaintenanceSeverity.HIGH,
        )
        result = agent.report_issue(issue)

        assert result.result_status == MaintenanceResultStatus.WAITING_FOR_TECHNICIAN, f"Expected WAITING_FOR_TECHNICIAN, got {result.result_status}"
        assert result.assigned_technician_id is None, f"Expected None assigned_technician_id, got {result.assigned_technician_id}"
        assert result.incident_status == IncidentStatus.ESCALATED, f"Expected ESCALATED incident_status, got {result.incident_status}"
        print("Test 4: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 4: FAIL - {e}")

    # Test 5: Invalid room_id (999) -> ValueError
    try:
        seed_db()
        repo = PostgresHotelRepository()
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=999,
            reported_by_staff_id=202,
            description="Non-existent room report",
            category=MaintenanceCategory.GENERAL,
            severity=MaintenanceSeverity.LOW,
        )
        try:
            agent.report_issue(issue)
            print("Test 5: FAIL - Expected ValueError was not raised")
        except ValueError:
            print("Test 5: PASS")
            passed += 1
    except Exception as e:
        print(f"Test 5: FAIL - {e}")

    # Test 6: Invalid reported_by_staff_id (999) -> ValueError
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=999,
            description="Report by non-existent staff member",
            category=MaintenanceCategory.GENERAL,
            severity=MaintenanceSeverity.LOW,
        )
        try:
            agent.report_issue(issue)
            print("Test 6: FAIL - Expected ValueError was not raised")
        except ValueError:
            print("Test 6: PASS")
            passed += 1
    except Exception as e:
        print(f"Test 6: FAIL - {e}")

    # Test 7: reported_by_staff_id=301 (MAINTENANCE staff) -> successfully reports issue
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=301,
            description="Report by maintenance staff for secondary issue",
            category=MaintenanceCategory.GENERAL,
            severity=MaintenanceSeverity.LOW,
        )
        result = agent.report_issue(issue)
        assert result.incident_id is not None, "Expected valid incident_id"
        assert result.assigned_technician_id is not None, "Expected assigned technician"
        print("Test 7: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 7: FAIL - {e}")

    # Test 8: Room 1 status OCCUPIED -> Maintenance reported and room remains OCCUPIED
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.OCCUPIED)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=202,
            description="AC not cooling properly in occupied room",
            category=MaintenanceCategory.HVAC,
            severity=MaintenanceSeverity.MEDIUM,
        )
        result = agent.report_issue(issue)
        assert result.assigned_technician_id == 301, f"Expected tech 301, got {result.assigned_technician_id}"
        assert result.new_room_status == RoomStatus.OCCUPIED, f"Expected room to remain OCCUPIED, got {result.new_room_status}"
        assert repo.get_room_by_id(1).status == RoomStatus.OCCUPIED, f"Expected repo room to remain OCCUPIED, got {repo.get_room_by_id(1).status}"
        print("Test 8: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 8: FAIL - {e}")

    # Test 9: Verify incident and task persist in repository
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=202,
            description="Verification of stored incident and task",
            category=MaintenanceCategory.HVAC,
            severity=MaintenanceSeverity.HIGH,
        )
        result = agent.report_issue(issue)

        incident = repo.get_maintenance_incident_by_id(result.incident_id)
        task = repo.get_operational_task_by_id(result.operational_task_id)

        assert incident is not None, "Incident was not saved in repository"
        assert task is not None, "Operational task was not saved in repository"
        print("Test 9: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 9: FAIL - {e}")

    # Test 10: Check activity logs on MaintenanceAgent instance
    try:
        seed_db()
        repo = PostgresHotelRepository()
        repo.update_room_status(1, RoomStatus.CLEANING)
        agent = MaintenanceAgent(repo)

        issue = MaintenanceIssueReport(
            room_id=1,
            reported_by_staff_id=202,
            description="Activity log verification test",
            category=MaintenanceCategory.HVAC,
            severity=MaintenanceSeverity.HIGH,
        )
        result = agent.report_issue(issue)

        log_entry = next(
            (
                entry
                for entry in agent.activity_logs
                if entry.get("action") == "CREATE_AND_ASSIGN_INCIDENT"
                and entry.get("status") == "COMPLETED"
            ),
            None,
        )

        assert log_entry is not None, "Activity log entry not found"
        assert log_entry["room_id"] == 1, f"Expected room_id 1 in log, got {log_entry['room_id']}"
        assert log_entry["incident_id"] == result.incident_id, f"Expected incident_id {result.incident_id} in log, got {log_entry['incident_id']}"
        print("Test 10: PASS")
        passed += 1
    except Exception as e:
        print(f"Test 10: FAIL - {e}")

    print("-" * 30)
    print(f"Summary: {passed}/{total} tests passed.")


if __name__ == "__main__":
    run_all_tests()
