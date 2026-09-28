import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests
from sqlalchemy import text
from app.database.connection import engine

BASE_URL = "http://127.0.0.1:8000"

def get_incidents_count():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT COUNT(*) FROM maintenance_incidents"))
        return res.scalar()

def get_tasks():
    res = requests.get(f"{BASE_URL}/api/tasks")
    return res.json()

def get_room(room_id=1):
    res = requests.get(f"{BASE_URL}/api/rooms/{room_id}")
    return res.json()

def main():
    print("=" * 80)
    print("ISSUE CLASSIFIER AGENT - INVALID (NON-MAINTENANCE) ISSUES VERIFICATION")
    print("=" * 80)

    # 1. Baseline Counts
    baseline_tasks = get_tasks()
    baseline_incidents_count = get_incidents_count()
    baseline_room = get_room(1)

    print(f"\n[BASELINE STATE]")
    print(f"- Total Operational Tasks: {len(baseline_tasks)}")
    print(f"- Total Maintenance Incidents in DB: {baseline_incidents_count}")
    print(f"- Room 1 Status: {baseline_room.get('status')}")

    test_cases = [
        "There is no bottle in my room",
        "Can you bring extra towels",
        "I need a water bottle",
        "Please clean my room again",
        "asdkj alskdj laskjd"
    ]

    results = []

    for idx, desc in enumerate(test_cases, 1):
        print("\n" + "-" * 80)
        print(f"TEST CASE {idx}: Description = \"{desc}\"")
        print("-" * 80)

        payload = {
            "room_id": 1,
            "reported_by_staff_id": 201,
            "description": desc
        }

        response = requests.post(f"{BASE_URL}/api/events/maintenance-issue", json=payload)
        
        try:
            resp_body = response.json()
        except Exception:
            resp_body = response.text

        current_tasks = get_tasks()
        current_incidents_count = get_incidents_count()
        current_room = get_room(1)

        tasks_created = len(current_tasks) - len(baseline_tasks)
        incidents_created = current_incidents_count - baseline_incidents_count

        is_rejected = (response.status_code == 400 and tasks_created == 0 and incidents_created == 0)

        print(f"1. HTTP Status Code: {response.status_code}")
        print(f"2. Full API Response Body:\n{json.dumps(resp_body, indent=2) if isinstance(resp_body, dict) else resp_body}")
        print(f"3. Verification Status: {'REJECTED (CORRECT)' if is_rejected else 'FAILED'}")
        print(f"   - Tasks created: {tasks_created} (Total: {len(current_tasks)})")
        print(f"   - Incidents created: {incidents_created} (Total: {current_incidents_count})")
        print(f"   - Room 1 Status: {current_room.get('status')} (Unchanged: {current_room.get('status') == baseline_room.get('status')})")

        results.append({
            "index": idx,
            "description": desc,
            "status_code": response.status_code,
            "response": resp_body,
            "tasks_count": len(current_tasks),
            "incidents_count": current_incidents_count,
            "room_status": current_room.get("status"),
            "passed": is_rejected
        })

    # Summary
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY TABLE")
    print("=" * 80)
    print(f"{'#':<3} | {'Description':<35} | {'HTTP':<5} | {'Tasks':<6} | {'Incidents':<10} | {'Room Status':<12} | {'Result':<8}")
    print("-" * 90)
    for r in results:
        res_str = "PASS" if r["passed"] else "FAIL"
        print(f"{r['index']:<3} | {r['description'][:35]:<35} | {r['status_code']:<5} | {r['tasks_count']:<6} | {r['incidents_count']:<10} | {str(r['room_status']):<12} | {res_str:<8}")

    all_passed = all(r["passed"] for r in results)
    print("\n" + "=" * 80)
    print(f"OVERALL RESULT: {'ALL PASSED (Issue Classifier Agent successfully rejected all invalid requests)' if all_passed else 'SOME FAILED'}")
    print("=" * 80)

if __name__ == "__main__":
    main()
