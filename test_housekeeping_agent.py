import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent))

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from app.agents.housekeeping_agent import HousekeepingAgent
from app.agents.room_readiness_agent import RoomReadinessAgent
from app.database.orm import StaffEntity
from app.database.seed import seed_db
from app.models.checkout_event import CheckoutEvent
from app.models.enums import RoomStatus, StaffRole, TaskStatus
from app.models.room_readiness_result import RoomReadinessResult
from app.repositories.postgres_hotel_repository import PostgresHotelRepository


def main():
    print("=" * 70)
    print("RUNNING HOUSEKEEPING AGENT SCENARIOS")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # Scenario 1: Assign Room with id=1 (room_number "405", CRITICAL priority)
    # -------------------------------------------------------------------------
    print("\nScenario 1: Assign Room id=1 after checkout (CRITICAL priority)")
    seed_db()
    repo1 = PostgresHotelRepository()
    readiness_agent1 = RoomReadinessAgent(repo1)
    housekeeping_agent1 = HousekeepingAgent(repo1)

    checkout_event1 = CheckoutEvent(
        property_id=1,
        room_id=1,
        reservation_id=5001,
        checkout_time=datetime(2026, 8, 29, 10, 0, tzinfo=timezone.utc),
    )
    readiness1 = readiness_agent1.evaluate_checkout(checkout_event1)
    result1 = housekeeping_agent1.assign_cleaning_task(readiness1)

    print(f"  Result status: {result1.status}")
    print(f"  Assigned staff ID: {result1.assigned_staff_id} ({result1.assigned_staff_name})")
    print(f"  Task status: {result1.task_status}")
    print(f"  New room status: {result1.new_room_status}")

    assert result1.status == "HOUSEKEEPING_ASSIGNED"
    assert result1.assigned_staff_id in (201, 202)
    assert result1.task_status == TaskStatus.ASSIGNED
    assert result1.new_room_status == RoomStatus.CLEANING
    assert repo1.get_room_by_id(1).status == RoomStatus.CLEANING
    print("  [SUCCESS] Scenario 1 passed.")

    # -------------------------------------------------------------------------
    # Scenario 2: Staff-selection rules
    # -------------------------------------------------------------------------
    print("\nScenario 2: Staff-selection rules (floor match, lowest workload, role check)")
    seed_db()
    repo2 = PostgresHotelRepository()
    # Set staff 201 to active_task_count=1 to test workload priority
    with repo2.session_factory() as session:
        s201 = session.get(StaffEntity, 201)
        if s201:
            s201.active_task_count = 1
            s201.is_available = True
        session.commit()

    readiness_agent2 = RoomReadinessAgent(repo2)
    housekeeping_agent2 = HousekeepingAgent(repo2)

    available_housekeeping = repo2.get_available_housekeeping_staff(room_floor=4)
    staff_ids = [s.id for s in available_housekeeping]

    print(f"  Available housekeeping staff for floor 4: {staff_ids}")
    assert 301 not in staff_ids, "Staff 301 (MAINTENANCE) should not be eligible for housekeeping"
    assert staff_ids[0] == 202, "Staff 202 should be selected over 201 (same floor, lower workload)"
    assert staff_ids.index(203) > staff_ids.index(202), "Staff 203 (floor 3) should lose to floor 4 staff"

    readiness2 = readiness_agent2.evaluate_checkout(checkout_event1)
    result2 = housekeeping_agent2.assign_cleaning_task(readiness2)
    assert result2.assigned_staff_id == 202
    print("  [SUCCESS] Scenario 2 passed.")

    # -------------------------------------------------------------------------
    # Scenario 3: Retrieve saved task via repository
    # -------------------------------------------------------------------------
    print("\nScenario 3: Retrieve saved task via repository")
    seed_db()
    repo3 = PostgresHotelRepository()
    readiness_agent3 = RoomReadinessAgent(repo3)
    housekeeping_agent3 = HousekeepingAgent(repo3)

    readiness3 = readiness_agent3.evaluate_checkout(checkout_event1)
    result3 = housekeeping_agent3.assign_cleaning_task(readiness3)

    saved_task = repo3.get_operational_task_by_id(result3.task_id)
    assert saved_task is not None, "Task should exist in repository"
    assert saved_task.room_id == readiness3.room_id
    assert saved_task.priority_score == readiness3.priority_score
    assert saved_task.assigned_staff_id == result3.assigned_staff_id
    assert saved_task.status == TaskStatus.ASSIGNED
    print(f"  Retrieved Task ID: {saved_task.id}")
    print(f"  Task room_id={saved_task.room_id}, score={saved_task.priority_score}, staff={saved_task.assigned_staff_id}, status={saved_task.status}")
    print("  [SUCCESS] Scenario 3 passed.")

    # -------------------------------------------------------------------------
    # Scenario 4: Staff state changes after assignment
    # -------------------------------------------------------------------------
    print("\nScenario 4: Staff state changes after assignment")
    seed_db()
    repo4 = PostgresHotelRepository()
    # Set staff 201 busy so 202 is picked for assignment
    with repo4.session_factory() as session:
        s201 = session.get(StaffEntity, 201)
        if s201:
            s201.is_available = False
        session.commit()

    readiness_agent4 = RoomReadinessAgent(repo4)
    housekeeping_agent4 = HousekeepingAgent(repo4)

    staff_202_before = repo4.get_staff_by_id(202)
    assert staff_202_before.active_task_count == 0
    assert staff_202_before.is_available is True

    readiness4 = readiness_agent4.evaluate_checkout(checkout_event1)
    housekeeping_agent4.assign_cleaning_task(readiness4)

    staff_202_after = repo4.get_staff_by_id(202)
    print(f"  Staff 202 before -> active_task_count=0, is_available=True")
    print(f"  Staff 202 after  -> active_task_count={staff_202_after.active_task_count}, is_available={staff_202_after.is_available}")

    assert staff_202_after.active_task_count == 1
    assert staff_202_after.is_available is False
    print("  [SUCCESS] Scenario 4 passed.")

    # -------------------------------------------------------------------------
    # Scenario 5: No-staff scenario
    # -------------------------------------------------------------------------
    print("\nScenario 5: No-staff scenario (all staff unavailable)")
    seed_db()
    repo5 = PostgresHotelRepository()
    readiness_agent5 = RoomReadinessAgent(repo5)
    housekeeping_agent5 = HousekeepingAgent(repo5)

    readiness5 = readiness_agent5.evaluate_checkout(checkout_event1)

    with repo5.session_factory() as session:
        stmt = select(StaffEntity).where(StaffEntity.role == StaffRole.HOUSEKEEPING.value)
        for s in session.execute(stmt).scalars():
            s.is_available = False
        session.commit()

    result5 = housekeeping_agent5.assign_cleaning_task(readiness5)
    print(f"  Result status: {result5.status}")
    print(f"  Task ID: {result5.task_id}")
    print(f"  Room status in repo: {repo5.get_room_by_id(1).status}")

    assert result5.status == "WAITING_FOR_STAFF"
    assert result5.task_id is None
    assert repo5.get_room_by_id(1).status == RoomStatus.DIRTY
    print("  [SUCCESS] Scenario 5 passed.")

    # -------------------------------------------------------------------------
    # Scenario 6: Invalid room state (room is READY, not DIRTY)
    # -------------------------------------------------------------------------
    print("\nScenario 6: Invalid room state (attempting assignment on READY room)")
    seed_db()
    repo6 = PostgresHotelRepository()
    housekeeping_agent6 = HousekeepingAgent(repo6)

    # Room 2 is READY in seed data
    invalid_readiness = RoomReadinessResult(
        event_id=uuid4(),
        room_id=2,
        previous_status="READY",
        new_status="READY",
        next_reservation_id=None,
        next_guest_id=None,
        next_guest_type=None,
        early_check_in_requested=False,
        hours_until_arrival=None,
        priority_score=10,
        priority_level="NORMAL",
        next_agent="HOUSEKEEPING_AGENT",
        status="READY_FOR_HOUSEKEEPING",
        reason="Test invalid status",
    )

    caught_error = False
    try:
        housekeeping_agent6.assign_cleaning_task(invalid_readiness)
    except ValueError as e:
        caught_error = True
        print(f"  Caught expected ValueError: {e}")

    assert caught_error, "Expected ValueError when assigning task to non-DIRTY room"
    print("  [SUCCESS] Scenario 6 passed.")

    print("\n" + "=" * 70)
    print("ALL 6 SCENARIOS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    main()
