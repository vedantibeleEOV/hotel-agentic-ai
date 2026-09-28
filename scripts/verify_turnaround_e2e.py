import json
import requests

BASE_URL = "http://127.0.0.1:8000"

def get_room_1():
    res = requests.get(f"{BASE_URL}/api/rooms/1")
    return res.json()

def get_all_tasks():
    res = requests.get(f"{BASE_URL}/api/tasks")
    return res.json()

def print_step_header(step_num, title):
    print("\n" + "=" * 80)
    print(f"STEP {step_num}: {title}")
    print("=" * 80)

def print_step_inspection(endpoint_called, response_data, room_data, tasks_data):
    print(f"\n--- 1. API Endpoint Called: {endpoint_called} ---")
    print(json.dumps(response_data, indent=2, default=str))
    
    print("\n--- 2. GET /api/rooms/1 (Room Status) ---")
    print(f"Room ID: {room_data.get('id')}, Status: {room_data.get('status')}")
    print(json.dumps(room_data, indent=2, default=str))
    
    print("\n--- 3. GET /api/tasks (All Tasks) ---")
    print(f"Total tasks: {len(tasks_data)}")
    for t in tasks_data:
        print(f"  - Task ID: {t.get('id')} | Type: {t.get('task_type')} | Status: {t.get('status')} | Room: {t.get('room_id')}")
    print(json.dumps(tasks_data, indent=2, default=str))

def find_task_status(tasks_data, task_id):
    if not task_id:
        return "N/A"
    for t in tasks_data:
        if str(t.get("id")) == str(task_id):
            return t.get("status")
    return "N/A"

def main():
    housekeeping_task_id = None
    maintenance_task_id = None
    summary_records = []

    # Step 1: POST /api/reset
    print_step_header(1, "POST /api/reset")
    r1 = requests.post(f"{BASE_URL}/api/reset")
    d1 = r1.json()
    room1 = get_room_1()
    tasks1 = get_all_tasks()
    print_step_inspection("POST /api/reset", d1, room1, tasks1)
    summary_records.append({
        "step": 1,
        "action": "POST /api/reset",
        "room_status": room1.get("status"),
        "hk_status": find_task_status(tasks1, housekeeping_task_id),
        "maint_status": find_task_status(tasks1, maintenance_task_id)
    })

    # Step 2: POST /api/events/checkout with body {"room_id": 1, "reservation_id": 5001}
    print_step_header(2, 'POST /api/events/checkout ({"room_id": 1, "reservation_id": 5001})')
    r2 = requests.post(f"{BASE_URL}/api/events/checkout", json={"room_id": 1, "reservation_id": 5001})
    d2 = r2.json()
    # Extract housekeeping task_id
    if "housekeeping" in d2 and "task" in d2["housekeeping"] and "id" in d2["housekeeping"]["task"]:
        housekeeping_task_id = d2["housekeeping"]["task"]["id"]
    elif "housekeeping" in d2 and "id" in d2["housekeeping"]:
        housekeeping_task_id = d2["housekeeping"]["id"]
    elif "housekeeping" in d2 and isinstance(d2["housekeeping"], dict) and "task_id" in d2["housekeeping"]:
        housekeeping_task_id = d2["housekeeping"]["task_id"]
    
    room2 = get_room_1()
    tasks2 = get_all_tasks()
    if not housekeeping_task_id and len(tasks2) > 0:
        for t in tasks2:
            if t.get("task_type") == "ROOM_CLEANING":
                housekeeping_task_id = t.get("id")

    print(f"\n[INFO] Saved housekeeping_task_id = {housekeeping_task_id}")
    print_step_inspection("POST /api/events/checkout", d2, room2, tasks2)
    summary_records.append({
        "step": 2,
        "action": "POST /api/events/checkout",
        "room_status": room2.get("status"),
        "hk_status": find_task_status(tasks2, housekeeping_task_id),
        "maint_status": find_task_status(tasks2, maintenance_task_id)
    })

    # Step 3: GET /api/tasks
    print_step_header(3, "GET /api/tasks")
    r3 = requests.get(f"{BASE_URL}/api/tasks")
    d3 = r3.json()
    room3 = get_room_1()
    tasks3 = get_all_tasks()
    print_step_inspection("GET /api/tasks", d3, room3, tasks3)
    summary_records.append({
        "step": 3,
        "action": "GET /api/tasks",
        "room_status": room3.get("status"),
        "hk_status": find_task_status(tasks3, housekeeping_task_id),
        "maint_status": find_task_status(tasks3, maintenance_task_id)
    })

    # Step 4: POST /api/events/maintenance-issue with body {"room_id": 1, "reported_by_staff_id": 201, "description": "Water is leaking from the bathroom"}
    print_step_header(4, 'POST /api/events/maintenance-issue ({"room_id": 1, "reported_by_staff_id": 201, "description": "Water is leaking from the bathroom"})')
    r4 = requests.post(f"{BASE_URL}/api/events/maintenance-issue", json={
        "room_id": 1,
        "reported_by_staff_id": 201,
        "description": "Water is leaking from the bathroom"
    })
    d4 = r4.json()
    if "maintenance" in d4 and "task" in d4["maintenance"] and "id" in d4["maintenance"]["task"]:
        maintenance_task_id = d4["maintenance"]["task"]["id"]
    elif "maintenance" in d4 and "operational_task_id" in d4["maintenance"]:
        maintenance_task_id = d4["maintenance"]["operational_task_id"]
    elif "operational_task_id" in d4:
        maintenance_task_id = d4["operational_task_id"]
    
    room4 = get_room_1()
    tasks4 = get_all_tasks()
    if not maintenance_task_id:
        for t in tasks4:
            if t.get("task_type") == "ROOM_MAINTENANCE":
                maintenance_task_id = t.get("id")

    print(f"\n[INFO] Saved maintenance_task_id = {maintenance_task_id}")
    print_step_inspection("POST /api/events/maintenance-issue", d4, room4, tasks4)
    summary_records.append({
        "step": 4,
        "action": "POST /api/events/maintenance-issue",
        "room_status": room4.get("status"),
        "hk_status": find_task_status(tasks4, housekeeping_task_id),
        "maint_status": find_task_status(tasks4, maintenance_task_id)
    })

    # Step 5: GET /api/tasks/{housekeeping_task_id}
    print_step_header(5, f"GET /api/tasks/{housekeeping_task_id}")
    r5 = requests.get(f"{BASE_URL}/api/tasks/{housekeeping_task_id}")
    d5 = r5.json()
    room5 = get_room_1()
    tasks5 = get_all_tasks()
    print_step_inspection(f"GET /api/tasks/{housekeeping_task_id}", d5, room5, tasks5)
    summary_records.append({
        "step": 5,
        "action": f"GET /api/tasks/{housekeeping_task_id}",
        "room_status": room5.get("status"),
        "hk_status": find_task_status(tasks5, housekeeping_task_id),
        "maint_status": find_task_status(tasks5, maintenance_task_id)
    })

    # Step 6: GET /api/tasks
    print_step_header(6, "GET /api/tasks")
    r6 = requests.get(f"{BASE_URL}/api/tasks")
    d6 = r6.json()
    room6 = get_room_1()
    tasks6 = get_all_tasks()
    print_step_inspection("GET /api/tasks", d6, room6, tasks6)
    summary_records.append({
        "step": 6,
        "action": "GET /api/tasks",
        "room_status": room6.get("status"),
        "hk_status": find_task_status(tasks6, housekeeping_task_id),
        "maint_status": find_task_status(tasks6, maintenance_task_id)
    })

    # Step 7: POST /api/tasks/{maintenance_task_id}/complete
    print_step_header(7, f"POST /api/tasks/{maintenance_task_id}/complete")
    r7 = requests.post(f"{BASE_URL}/api/tasks/{maintenance_task_id}/complete")
    d7 = r7.json()
    room7 = get_room_1()
    tasks7 = get_all_tasks()
    print_step_inspection(f"POST /api/tasks/{maintenance_task_id}/complete", d7, room7, tasks7)
    summary_records.append({
        "step": 7,
        "action": f"POST /api/tasks/{maintenance_task_id}/complete",
        "room_status": room7.get("status"),
        "hk_status": find_task_status(tasks7, housekeeping_task_id),
        "maint_status": find_task_status(tasks7, maintenance_task_id)
    })

    # Step 8: GET /api/tasks/{housekeeping_task_id}
    print_step_header(8, f"GET /api/tasks/{housekeeping_task_id}")
    r8 = requests.get(f"{BASE_URL}/api/tasks/{housekeeping_task_id}")
    d8 = r8.json()
    room8 = get_room_1()
    tasks8 = get_all_tasks()
    print_step_inspection(f"GET /api/tasks/{housekeeping_task_id}", d8, room8, tasks8)
    summary_records.append({
        "step": 8,
        "action": f"GET /api/tasks/{housekeeping_task_id}",
        "room_status": room8.get("status"),
        "hk_status": find_task_status(tasks8, housekeeping_task_id),
        "maint_status": find_task_status(tasks8, maintenance_task_id)
    })

    # Step 9: POST /api/tasks/{housekeeping_task_id}/complete
    print_step_header(9, f"POST /api/tasks/{housekeeping_task_id}/complete")
    r9 = requests.post(f"{BASE_URL}/api/tasks/{housekeeping_task_id}/complete")
    d9 = r9.json()
    room9 = get_room_1()
    tasks9 = get_all_tasks()
    print_step_inspection(f"POST /api/tasks/{housekeeping_task_id}/complete", d9, room9, tasks9)
    summary_records.append({
        "step": 9,
        "action": f"POST /api/tasks/{housekeeping_task_id}/complete",
        "room_status": room9.get("status"),
        "hk_status": find_task_status(tasks9, housekeeping_task_id),
        "maint_status": find_task_status(tasks9, maintenance_task_id)
    })

    # Step 10: GET /api/tasks
    print_step_header(10, "GET /api/tasks")
    r10 = requests.get(f"{BASE_URL}/api/tasks")
    d10 = r10.json()
    room10 = get_room_1()
    tasks10 = get_all_tasks()
    print_step_inspection("GET /api/tasks", d10, room10, tasks10)
    summary_records.append({
        "step": 10,
        "action": "GET /api/tasks",
        "room_status": room10.get("status"),
        "hk_status": find_task_status(tasks10, housekeeping_task_id),
        "maint_status": find_task_status(tasks10, maintenance_task_id)
    })

    # Print Summary Table
    print("\n" + "=" * 80)
    print("SUMMARY TABLE")
    print("=" * 80)
    print(f"{'Step':<6} | {'Action':<45} | {'Room Status':<12} | {'HK Task':<10} | {'Maint Task':<10}")
    print("-" * 92)
    for rec in summary_records:
        print(f"{rec['step']:<6} | {rec['action']:<45} | {str(rec['room_status']):<12} | {str(rec['hk_status']):<10} | {str(rec['maint_status']):<10}")

    print("\n" + "=" * 80)
    print("VERIFICATION CHECKS")
    print("=" * 80)
    
    # Check 1: Step 5
    step5_hk = summary_records[4]["hk_status"]
    step5_room = summary_records[4]["room_status"]
    step5_pass = (step5_hk == "ON_HOLD" and step5_room == "MAINTENANCE")
    print(f"Step 5 Check: HK task ON_HOLD & Room MAINTENANCE -> Actual: HK={step5_hk}, Room={step5_room} => {'PASS' if step5_pass else 'FAIL'}")

    # Check 2: Step 8
    step8_hk = summary_records[7]["hk_status"]
    step8_room = summary_records[7]["room_status"]
    step8_pass = (step8_hk == "ASSIGNED" and step8_room == "CLEANING")
    print(f"Step 8 Check: HK task ASSIGNED & Room CLEANING (not READY) -> Actual: HK={step8_hk}, Room={step8_room} => {'PASS' if step8_pass else 'FAIL'}")

    # Check 3: Step 10
    step10_hk = summary_records[9]["hk_status"]
    step10_maint = summary_records[9]["maint_status"]
    step10_room = summary_records[9]["room_status"]
    step10_pass = (step10_hk == "COMPLETED" and step10_maint == "COMPLETED" and step10_room == "READY")
    print(f"Step 10 Check: Both tasks COMPLETED & Room READY -> Actual: HK={step10_hk}, Maint={step10_maint}, Room={step10_room} => {'PASS' if step10_pass else 'FAIL'}")

if __name__ == "__main__":
    main()
