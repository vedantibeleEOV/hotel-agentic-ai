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

def get_latest_incident():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, description, category, severity, affects_room_readiness, sla_minutes, status, created_at FROM maintenance_incidents ORDER BY created_at DESC LIMIT 1")).mappings().first()
        return dict(res) if res else None

def get_tasks():
    res = requests.get(f"{BASE_URL}/api/tasks")
    return res.json()

def get_room(room_id=1):
    res = requests.get(f"{BASE_URL}/api/rooms/{room_id}")
    return res.json()

def reset_db():
    res = requests.post(f"{BASE_URL}/api/reset")
    return res.json()

def main():
    print("=" * 90)
    print("COMPREHENSIVE END-TO-END VERIFICATION: ISSUE CLASSIFIER AGENT")
    print("=" * 90)

    # Reset system first to have clean baseline
    reset_db()

    # Step 1: Baseline inspection
    baseline_tasks = get_tasks()
    baseline_incidents_count = get_incidents_count()
    baseline_room = get_room(1)

    print("\n[STEP 1: BASELINE STATE]")
    print(f"- Total Operational Tasks: {len(baseline_tasks)}")
    print(f"- Total Maintenance Incidents in DB: {baseline_incidents_count}")
    print(f"- Room 1 Status: {baseline_room.get('status')}")

    summary_rows = []

    # Step 2: Test INVALID descriptions
    invalid_cases = [
        "There is no bottle in my room",
        "Can you bring extra towels",
        "I need a water bottle",
        "Please clean my room again",
        "asdkj alskdj laskjd"
    ]

    print("\n" + "=" * 90)
    print("[STEP 2: TESTING INVALID (NON-MAINTENANCE) DESCRIPTIONS]")
    print("=" * 90)

    prev_tasks_count = len(baseline_tasks)
    prev_incidents_count = baseline_incidents_count
    prev_room_status = baseline_room.get("status")

    for idx, desc in enumerate(invalid_cases, 1):
        print("\n" + "-" * 80)
        print(f"INVALID TEST #{idx}: \"{desc}\"")
        print("-" * 80)

        payload = {
            "room_id": 1,
            "reported_by_staff_id": 201,
            "description": desc
        }
        res = requests.post(f"{BASE_URL}/api/events/maintenance-issue", json=payload)
        try:
            resp_body = res.json()
        except Exception:
            resp_body = res.text

        curr_tasks = get_tasks()
        curr_incidents_count = get_incidents_count()
        curr_room = get_room(1)

        incidents_delta = curr_incidents_count - prev_incidents_count
        tasks_delta = len(curr_tasks) - prev_tasks_count
        room_changed = (curr_room.get("status") != prev_room_status)

        is_rejected = (res.status_code == 400 and "Please provide a valid maintenance issue description" in str(resp_body))
        incident_created = (incidents_delta > 0)
        room_task_affected = (tasks_delta != 0 or room_changed)

        print(f"1. HTTP Status Code: {res.status_code}")
        print(f"2. Full API Response Body:\n{json.dumps(resp_body, indent=2) if isinstance(resp_body, dict) else resp_body}")
        print(f"3. Verification Analysis:")
        print(f"   - is_valid_issue = False (rejected by orchestrator/classifier): {'YES (CORRECT)' if is_rejected else 'NO (WRONGLY ACCEPTED)'}")
        print(f"   - Maintenance incident created: {'NO (CORRECT)' if not incident_created else 'YES (ERROR)'} (Count: {curr_incidents_count})")
        print(f"   - Room status or tasks affected: {'NO (CORRECT)' if not room_task_affected else 'YES (ERROR)'} (Room: {curr_room.get('status')}, Tasks: {len(curr_tasks)})")

        summary_rows.append({
            "desc": desc,
            "is_valid_issue": False if is_rejected else True,
            "incident_created": "No" if not incident_created else "Yes",
            "affected": "No" if not room_task_affected else "Yes",
            "passed": is_rejected and not incident_created and not room_task_affected,
            "type": "INVALID"
        })

        prev_tasks_count = len(curr_tasks)
        prev_incidents_count = curr_incidents_count
        prev_room_status = curr_room.get("status")

    # Step 3: Test VALID descriptions
    valid_cases = [
        {
            "desc": "Water is leaking from the bathroom",
            "expected_affects_room": True
        },
        {
            "desc": "Room light bulb is not working",
            "expected_affects_room": False
        }
    ]

    print("\n" + "=" * 90)
    print("[STEP 3: TESTING VALID MAINTENANCE DESCRIPTIONS]")
    print("=" * 90)

    for idx, case in enumerate(valid_cases, 1):
        desc = case["desc"]
        exp_affects = case["expected_affects_room"]

        print("\n" + "-" * 80)
        print(f"VALID TEST #{idx}: \"{desc}\"")
        print("-" * 80)

        payload = {
            "room_id": 1,
            "reported_by_staff_id": 201,
            "description": desc
        }
        res = requests.post(f"{BASE_URL}/api/events/maintenance-issue", json=payload)
        try:
            resp_body = res.json()
        except Exception:
            resp_body = res.text

        curr_tasks = get_tasks()
        curr_incidents_count = get_incidents_count()
        curr_room = get_room(1)
        latest_inc = get_latest_incident()

        incidents_delta = curr_incidents_count - prev_incidents_count
        tasks_delta = len(curr_tasks) - prev_tasks_count
        room_changed = (curr_room.get("status") != prev_room_status)

        is_accepted = (res.status_code == 202)
        incident_created = (incidents_delta > 0)
        
        cat = latest_inc.get("category") if latest_inc else None
        sev = latest_inc.get("severity") if latest_inc else None
        affects_val = latest_inc.get("affects_room_readiness") if latest_inc else None

        affects_correct = (affects_val == exp_affects)

        print(f"1. HTTP Status Code: {res.status_code}")
        print(f"2. Full API Response Body:\n{json.dumps(resp_body, indent=2) if isinstance(resp_body, dict) else resp_body}")
        print(f"3. Verification Analysis:")
        print(f"   - is_valid_issue: True")
        print(f"   - Category: {cat}")
        print(f"   - Severity: {sev}")
        print(f"   - affects_room_readiness: {affects_val} (Expected: {exp_affects}) => {'CORRECT' if affects_correct else 'MISMATCH'}")
        print(f"   - Maintenance incident created: {'YES (CORRECT)' if incident_created else 'NO (ERROR)'} (Incident ID: {latest_inc.get('id') if latest_inc else 'None'})")
        print(f"   - Room Status: {curr_room.get('status')} | Total Tasks: {len(curr_tasks)}")

        passed = (is_accepted and incident_created and affects_correct)
        summary_rows.append({
            "desc": desc,
            "is_valid_issue": True if is_accepted else False,
            "incident_created": "Yes" if incident_created else "No",
            "affected": "Yes (Task & Incident created)" if (tasks_delta > 0 and incident_created) else "No",
            "category": cat,
            "severity": sev,
            "affects_room_readiness": affects_val,
            "passed": passed,
            "type": "VALID"
        })

        prev_tasks_count = len(curr_tasks)
        prev_incidents_count = curr_incidents_count
        prev_room_status = curr_room.get("status")

    # Step 4: Summary Table
    print("\n" + "=" * 90)
    print("STEP 4: SUMMARY TABLE")
    print("=" * 90)
    print(f"{'Description':<42} | {'is_valid_issue':<14} | {'Incident Created?':<17} | {'Room/Task Affected?':<25}")
    print("-" * 105)
    for r in summary_rows:
        valid_str = "True" if r["is_valid_issue"] else "False"
        print(f"{r['desc'][:42]:<42} | {valid_str:<14} | {r['incident_created']:<17} | {r['affected']:<25}")

    # Step 5: Flags / Checks
    print("\n" + "=" * 90)
    print("STEP 5: INTEGRITY & CLASSIFICATION CHECKS")
    print("=" * 90)
    
    invalid_accepted = [r for r in summary_rows if r["type"] == "INVALID" and not r["passed"]]
    valid_rejected = [r for r in summary_rows if r["type"] == "VALID" and not r["passed"]]

    if not invalid_accepted:
        print("[CHECK 1] Invalid descriptions: ALL 5 CORRECTLY REJECTED (0 wrongly accepted).")
    else:
        print(f"[CHECK 1 FAIL] Some invalid descriptions were wrongly accepted: {invalid_accepted}")

    if not valid_rejected:
        print("[CHECK 2] Valid descriptions: ALL 2 CORRECTLY ACCEPTED & CLASSIFIED (0 wrongly rejected).")
    else:
        print(f"[CHECK 2 FAIL] Some valid descriptions were wrongly rejected/misclassified: {valid_rejected}")

    all_tests_passed = all(r["passed"] for r in summary_rows)
    print(f"\n[FINAL STATUS]: {'ALL CHECKS PASSED PERFECTLY' if all_tests_passed else 'SOME CHECKS FAILED'}")

if __name__ == "__main__":
    main()
