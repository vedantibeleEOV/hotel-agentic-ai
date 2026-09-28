import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests

BASE_URL = "http://127.0.0.1:8000"

def get_room(room_id=1):
    res = requests.get(f"{BASE_URL}/api/rooms/{room_id}")
    return res.json()

def get_tasks():
    res = requests.get(f"{BASE_URL}/api/tasks")
    return res.json()

def get_task(task_id):
    res = requests.get(f"{BASE_URL}/api/tasks/{task_id}")
    return res.json()

def reset_db():
    res = requests.post(f"{BASE_URL}/api/reset")
    return res.json()

def main():
    print("=" * 90)
    print("END-TO-END TEST SUITE: 3 ROOM & TASK STATUS SCENARIOS")
    print("=" * 90)

    summary_rows = []

    # =========================================================================
    # CASE 1: No maintenance issue at all
    # =========================================================================
    print("\n" + "#" * 90)
    print("=== CASE 1: No maintenance issue at all ===")
    print("#" * 90)

    # 1. Reset
    print("\n[Case 1 - Step 1] POST /api/reset")
    reset_db()

    # 2. Checkout
    print("[Case 1 - Step 2] POST /api/events/checkout (room_id: 1, reservation_id: 5003)")
    r_co1 = requests.post(f"{BASE_URL}/api/events/checkout", json={"room_id": 1, "reservation_id": 5003})
    d_co1 = r_co1.json()
    hk_task_id_1 = None
    if "housekeeping" in d_co1 and isinstance(d_co1["housekeeping"], dict):
        hk_task_id_1 = d_co1["housekeeping"].get("task_id")
    if not hk_task_id_1:
        tasks = get_tasks()
        for t in tasks:
            if t.get("task_type") == "ROOM_CLEANING":
                hk_task_id_1 = t.get("id")
    print(f"  -> Saved Housekeeping Task ID: {hk_task_id_1}")

    # 3. GET /api/tasks
    print("[Case 1 - Step 3] GET /api/tasks")
    t_c1 = get_tasks()
    print(f"  -> Total tasks: {len(t_c1)}")

    # 4. Complete Housekeeping Task
    print(f"[Case 1 - Step 4] POST /api/tasks/{hk_task_id_1}/complete")
    r_comp1 = requests.post(f"{BASE_URL}/api/tasks/{hk_task_id_1}/complete")

    # 5. GET /api/rooms/1
    print("[Case 1 - Step 5] GET /api/rooms/1")
    room_c1 = get_room(1)
    status_c1 = room_c1.get("status")
    exp_c1 = "READY"
    pass_c1 = (status_c1 == exp_c1)
    print(f"  -> Room Status: {status_c1} (Expected: {exp_c1}) => {'PASS' if pass_c1 else 'FAIL'}")

    summary_rows.append({
        "case": "Case 1",
        "step": "Step 5: Room status after cleaning completed",
        "expected": exp_c1,
        "actual": status_c1,
        "passed": pass_c1
    })


    # =========================================================================
    # CASE 2: Non-dusty issue (bulb) — should NOT block housekeeping or change room to MAINTENANCE
    # =========================================================================
    print("\n" + "#" * 90)
    print("=== CASE 2: Non-dusty issue (bulb) — Non-blocking maintenance ===")
    print("#" * 90)

    # 1. Reset
    print("\n[Case 2 - Step 1] POST /api/reset")
    reset_db()

    # 2. Checkout
    print("[Case 2 - Step 2] POST /api/events/checkout (room_id: 1, reservation_id: 5004)")
    r_co2 = requests.post(f"{BASE_URL}/api/events/checkout", json={"room_id": 1, "reservation_id": 5004})
    d_co2 = r_co2.json()
    hk_task_id_2 = None
    if "housekeeping" in d_co2 and isinstance(d_co2["housekeeping"], dict):
        hk_task_id_2 = d_co2["housekeeping"].get("task_id")
    if not hk_task_id_2:
        tasks = get_tasks()
        for t in tasks:
            if t.get("task_type") == "ROOM_CLEANING":
                hk_task_id_2 = t.get("id")
    print(f"  -> Saved Housekeeping Task ID: {hk_task_id_2}")

    # 3. GET /api/rooms/1
    print("[Case 2 - Step 3] GET /api/rooms/1")
    room_c2_s3 = get_room(1)
    status_c2_s3 = room_c2_s3.get("status")
    exp_c2_s3 = "CLEANING"
    pass_c2_s3 = (status_c2_s3 == exp_c2_s3)
    print(f"  -> Room Status: {status_c2_s3} (Expected: {exp_c2_s3}) => {'PASS' if pass_c2_s3 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 2",
        "step": "Step 3: Room status after checkout",
        "expected": exp_c2_s3,
        "actual": status_c2_s3,
        "passed": pass_c2_s3
    })

    # 4. Report Maintenance Issue (Bulb)
    print("[Case 2 - Step 4] POST /api/events/maintenance-issue (\"Room light bulb is not working\")")
    r_m2 = requests.post(f"{BASE_URL}/api/events/maintenance-issue", json={
        "room_id": 1,
        "reported_by_staff_id": 201,
        "description": "Room light bulb is not working"
    })
    d_m2 = r_m2.json()
    maint_task_id_2 = None
    if "maintenance" in d_m2 and isinstance(d_m2["maintenance"], dict):
        maint_task_id_2 = d_m2["maintenance"].get("operational_task_id")
    if not maint_task_id_2:
        tasks = get_tasks()
        for t in tasks:
            if t.get("task_type") == "ROOM_MAINTENANCE":
                maint_task_id_2 = t.get("id")
    print(f"  -> Saved Maintenance Task ID: {maint_task_id_2}")

    # Check affects_room_readiness in incident / orchestration
    from sqlalchemy import text
    from app.database.connection import engine
    with engine.connect() as conn:
        latest_inc = conn.execute(text("SELECT affects_room_readiness FROM maintenance_incidents ORDER BY created_at DESC LIMIT 1")).scalar()
    exp_affects_c2 = False
    pass_affects_c2 = (latest_inc == exp_affects_c2)
    print(f"  -> affects_room_readiness: {latest_inc} (Expected: {exp_affects_c2}) => {'PASS' if pass_affects_c2 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 2",
        "step": "Step 4: affects_room_readiness for bulb",
        "expected": str(exp_affects_c2),
        "actual": str(latest_inc),
        "passed": pass_affects_c2
    })

    # 5. GET /api/rooms/1
    print("[Case 2 - Step 5] GET /api/rooms/1")
    room_c2_s5 = get_room(1)
    status_c2_s5 = room_c2_s5.get("status")
    exp_c2_s5 = "CLEANING"
    pass_c2_s5 = (status_c2_s5 == exp_c2_s5)
    print(f"  -> Room Status: {status_c2_s5} (Expected: {exp_c2_s5} - must NOT be MAINTENANCE) => {'PASS' if pass_c2_s5 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 2",
        "step": "Step 5: Room status after non-blocking issue reported",
        "expected": exp_c2_s5,
        "actual": status_c2_s5,
        "passed": pass_c2_s5
    })

    # 6. GET /api/tasks/{housekeeping_task_id}
    print(f"[Case 2 - Step 6] GET /api/tasks/{hk_task_id_2}")
    hk_task_res_2 = get_task(hk_task_id_2)
    hk_status_c2_s6 = hk_task_res_2.get("task", {}).get("status")
    exp_c2_s6 = "ASSIGNED"
    pass_c2_s6 = (hk_status_c2_s6 == exp_c2_s6)
    print(f"  -> Housekeeping Task Status: {hk_status_c2_s6} (Expected: {exp_c2_s6} - must NOT be ON_HOLD) => {'PASS' if pass_c2_s6 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 2",
        "step": "Step 6: Housekeeping task status",
        "expected": exp_c2_s6,
        "actual": str(hk_status_c2_s6),
        "passed": pass_c2_s6
    })

    # 7. Complete Maintenance Task (if task created, else proceed)
    if maint_task_id_2:
        print(f"[Case 2 - Step 7] POST /api/tasks/{maint_task_id_2}/complete")
        requests.post(f"{BASE_URL}/api/tasks/{maint_task_id_2}/complete")
    else:
        print(f"[Case 2 - Step 7] Maintenance task was escalated/not dispatched; skipping task completion.")

    # 8. GET /api/rooms/1
    print("[Case 2 - Step 8] GET /api/rooms/1")
    room_c2_s8 = get_room(1)
    status_c2_s8 = room_c2_s8.get("status")
    exp_c2_s8 = "CLEANING"
    pass_c2_s8 = (status_c2_s8 == exp_c2_s8)
    print(f"  -> Room Status: {status_c2_s8} (Expected: {exp_c2_s8} - not jump to READY yet) => {'PASS' if pass_c2_s8 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 2",
        "step": "Step 8: Room status after maintenance completed",
        "expected": exp_c2_s8,
        "actual": status_c2_s8,
        "passed": pass_c2_s8
    })

    # 9. Complete Housekeeping Task
    print(f"[Case 2 - Step 9] POST /api/tasks/{hk_task_id_2}/complete")
    requests.post(f"{BASE_URL}/api/tasks/{hk_task_id_2}/complete")

    # 10. GET /api/rooms/1
    print("[Case 2 - Step 10] GET /api/rooms/1")
    room_c2_s10 = get_room(1)
    status_c2_s10 = room_c2_s10.get("status")
    exp_c2_s10 = "READY"
    pass_c2_s10 = (status_c2_s10 == exp_c2_s10)
    print(f"  -> Room Status: {status_c2_s10} (Expected: {exp_c2_s10}) => {'PASS' if pass_c2_s10 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 2",
        "step": "Step 10: Room status after housekeeping completed",
        "expected": exp_c2_s10,
        "actual": status_c2_s10,
        "passed": pass_c2_s10
    })


    # =========================================================================
    # CASE 3: Dusty issue (leak) — SHOULD block housekeeping and change room to MAINTENANCE
    # =========================================================================
    print("\n" + "#" * 90)
    print("=== CASE 3: Dusty issue (leak) — Blocking maintenance ===")
    print("#" * 90)

    # 1. Reset
    print("\n[Case 3 - Step 1] POST /api/reset")
    reset_db()

    # 2. Checkout
    print("[Case 3 - Step 2] POST /api/events/checkout (room_id: 1, reservation_id: 5005)")
    r_co3 = requests.post(f"{BASE_URL}/api/events/checkout", json={"room_id": 1, "reservation_id": 5005})
    d_co3 = r_co3.json()
    hk_task_id_3 = None
    if "housekeeping" in d_co3 and isinstance(d_co3["housekeeping"], dict):
        hk_task_id_3 = d_co3["housekeeping"].get("task_id")
    if not hk_task_id_3:
        tasks = get_tasks()
        for t in tasks:
            if t.get("task_type") == "ROOM_CLEANING":
                hk_task_id_3 = t.get("id")
    print(f"  -> Saved Housekeeping Task ID: {hk_task_id_3}")

    # 3. Report Maintenance Issue (Leak)
    print("[Case 3 - Step 3] POST /api/events/maintenance-issue (\"Water is leaking from the bathroom\")")
    r_m3 = requests.post(f"{BASE_URL}/api/events/maintenance-issue", json={
        "room_id": 1,
        "reported_by_staff_id": 201,
        "description": "Water is leaking from the bathroom"
    })
    d_m3 = r_m3.json()
    maint_task_id_3 = None
    if "maintenance" in d_m3 and isinstance(d_m3["maintenance"], dict):
        maint_task_id_3 = d_m3["maintenance"].get("operational_task_id")
    if not maint_task_id_3:
        tasks = get_tasks()
        for t in tasks:
            if t.get("task_type") == "ROOM_MAINTENANCE":
                maint_task_id_3 = t.get("id")
    print(f"  -> Saved Maintenance Task ID: {maint_task_id_3}")

    with engine.connect() as conn:
        latest_inc_3 = conn.execute(text("SELECT affects_room_readiness FROM maintenance_incidents ORDER BY created_at DESC LIMIT 1")).scalar()
    exp_affects_c3 = True
    pass_affects_c3 = (latest_inc_3 == exp_affects_c3)
    print(f"  -> affects_room_readiness: {latest_inc_3} (Expected: {exp_affects_c3}) => {'PASS' if pass_affects_c3 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 3",
        "step": "Step 3: affects_room_readiness for leak",
        "expected": str(exp_affects_c3),
        "actual": str(latest_inc_3),
        "passed": pass_affects_c3
    })

    # 4. GET /api/rooms/1
    print("[Case 3 - Step 4] GET /api/rooms/1")
    room_c3_s4 = get_room(1)
    status_c3_s4 = room_c3_s4.get("status")
    exp_c3_s4 = "MAINTENANCE"
    pass_c3_s4 = (status_c3_s4 == exp_c3_s4)
    print(f"  -> Room Status: {status_c3_s4} (Expected: {exp_c3_s4}) => {'PASS' if pass_c3_s4 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 3",
        "step": "Step 4: Room status after blocking issue reported",
        "expected": exp_c3_s4,
        "actual": status_c3_s4,
        "passed": pass_c3_s4
    })

    # 5. GET /api/tasks/{housekeeping_task_id}
    print(f"[Case 3 - Step 5] GET /api/tasks/{hk_task_id_3}")
    hk_task_res_3 = get_task(hk_task_id_3)
    hk_status_c3_s5 = hk_task_res_3.get("task", {}).get("status")
    exp_c3_s5 = "ON_HOLD"
    pass_c3_s5 = (hk_status_c3_s5 == exp_c3_s5)
    print(f"  -> Housekeeping Task Status: {hk_status_c3_s5} (Expected: {exp_c3_s5}) => {'PASS' if pass_c3_s5 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 3",
        "step": "Step 5: Housekeeping task placed ON_HOLD",
        "expected": exp_c3_s5,
        "actual": str(hk_status_c3_s5),
        "passed": pass_c3_s5
    })

    # 6. Complete Maintenance Task
    print(f"[Case 3 - Step 6] POST /api/tasks/{maint_task_id_3}/complete")
    requests.post(f"{BASE_URL}/api/tasks/{maint_task_id_3}/complete")

    # 7. GET /api/rooms/1
    print("[Case 3 - Step 7] GET /api/rooms/1")
    room_c3_s7 = get_room(1)
    status_c3_s7 = room_c3_s7.get("status")
    exp_c3_s7 = "CLEANING"
    pass_c3_s7 = (status_c3_s7 == exp_c3_s7)
    print(f"  -> Room Status: {status_c3_s7} (Expected: {exp_c3_s7} - must NOT jump to READY) => {'PASS' if pass_c3_s7 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 3",
        "step": "Step 7: Room status returned to CLEANING after maintenance",
        "expected": exp_c3_s7,
        "actual": status_c3_s7,
        "passed": pass_c3_s7
    })

    # 8. GET /api/tasks/{housekeeping_task_id}
    print(f"[Case 3 - Step 8] GET /api/tasks/{hk_task_id_3}")
    hk_task_res_3_s8 = get_task(hk_task_id_3)
    hk_status_c3_s8 = hk_task_res_3_s8.get("task", {}).get("status")
    exp_c3_s8 = "ASSIGNED"
    pass_c3_s8 = (hk_status_c3_s8 == exp_c3_s8)
    print(f"  -> Housekeeping Task Status: {hk_status_c3_s8} (Expected: {exp_c3_s8} - released from hold) => {'PASS' if pass_c3_s8 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 3",
        "step": "Step 8: Housekeeping task released to ASSIGNED",
        "expected": exp_c3_s8,
        "actual": str(hk_status_c3_s8),
        "passed": pass_c3_s8
    })

    # 9. Complete Housekeeping Task
    print(f"[Case 3 - Step 9] POST /api/tasks/{hk_task_id_3}/complete")
    requests.post(f"{BASE_URL}/api/tasks/{hk_task_id_3}/complete")

    # 10. GET /api/rooms/1
    print("[Case 3 - Step 10] GET /api/rooms/1")
    room_c3_s10 = get_room(1)
    status_c3_s10 = room_c3_s10.get("status")
    exp_c3_s10 = "READY"
    pass_c3_s10 = (status_c3_s10 == exp_c3_s10)
    print(f"  -> Room Status: {status_c3_s10} (Expected: {exp_c3_s10}) => {'PASS' if pass_c3_s10 else 'FAIL'}")
    summary_rows.append({
        "case": "Case 3",
        "step": "Step 10: Room status after housekeeping completed",
        "expected": exp_c3_s10,
        "actual": status_c3_s10,
        "passed": pass_c3_s10
    })

    # Print Summary Table
    print("\n" + "=" * 90)
    print("SUMMARY TABLE")
    print("=" * 90)
    print(f"{'Case':<8} | {'Step / Check':<50} | {'Expected':<12} | {'Actual':<12} | {'PASS/FAIL':<10}")
    print("-" * 102)
    for r in summary_rows:
        pf = "PASS" if r["passed"] else "FAIL"
        print(f"{r['case']:<8} | {r['step']:<50} | {str(r['expected']):<12} | {str(r['actual']):<12} | {pf:<10}")

    case1_pass = all(r["passed"] for r in summary_rows if r["case"] == "Case 1")
    case2_pass = all(r["passed"] for r in summary_rows if r["case"] == "Case 2")
    case3_pass = all(r["passed"] for r in summary_rows if r["case"] == "Case 3")

    print("\n" + "=" * 90)
    print("FINAL VERDICT")
    print("=" * 90)
    print(f"- Case 1 (No maintenance issue): {'FULLY PASSED' if case1_pass else 'FAILED'}")
    print(f"- Case 2 (Non-dusty bulb issue): {'FULLY PASSED' if case2_pass else 'FAILED'}")
    print(f"- Case 3 (Dusty leak issue):     {'FULLY PASSED' if case3_pass else 'FAILED'}")
    
    all_pass = all(r["passed"] for r in summary_rows)
    print(f"\nOVERALL RESULT: {'ALL 3 CASES FULLY PASSED' if all_pass else 'SOME CHECKS FAILED'}")

if __name__ == "__main__":
    main()
