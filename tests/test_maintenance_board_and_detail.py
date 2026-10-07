import pytest
from uuid import UUID
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.postgres_hotel_repository import PostgresHotelRepository
from app.models.enums import RoomStatus, MaintenanceCategory, MaintenanceSeverity

client = TestClient(app)


def test_maintenance_board_summary_and_tabs():
    """Verify GET /api/maintenance/board returns summary KPIs, tab counts, issues, technicians, and warnings."""
    # 1. Report a maintenance issue to have data on board
    repo = PostgresHotelRepository()
    issue_payload = {
        "room_id": 2,  # Room 406
        "reported_by_staff_id": 201,
        "description": "AC compressor making loud buzzing sound and not cooling",
    }
    resp = client.post("/api/events/maintenance-issue", json=issue_payload)
    assert resp.status_code == 202

    # 2. Get maintenance board
    board_resp = client.get("/api/maintenance/board")
    assert board_resp.status_code == 200
    board_data = board_resp.json()

    # Verify top-level structure
    assert "summary" in board_data
    assert "tab_counts" in board_data
    assert "issues" in board_data
    assert "technicians" in board_data
    assert "warnings" in board_data

    # Verify KPIs
    summary = board_data["summary"]
    assert "open_issues" in summary
    assert "critical" in summary
    assert "high_priority" in summary
    assert "technicians" in summary
    assert "sla_breaches_today" in summary
    assert "avg_resolution" in summary
    assert summary["open_issues"] >= 1
    assert summary["technicians"]["total"] == 3  # Rakesh, Suresh, Vikram

    # Verify tabs
    tabs = board_data["tab_counts"]
    assert "open" in tabs
    assert "critical" in tabs
    assert "unassigned" in tabs
    assert "completed" in tabs
    assert tabs["open"] >= 1

    # Verify technician list includes skills & availability
    techs = board_data["technicians"]
    assert len(techs) == 3
    rakesh = next((t for t in techs if t["name"] == "Rakesh Jadhav"), None)
    assert rakesh is not None
    assert "HVAC" in rakesh["skills"]
    assert rakesh["availability"].upper() in ("AVAILABLE", "BUSY")


def test_maintenance_board_filters():
    """Verify GET /api/maintenance/board filters by floor, search, and tab."""
    # Report an issue on room 2 (Floor 4)
    client.post("/api/events/maintenance-issue", json={
        "room_id": 2,
        "reported_by_staff_id": 201,
        "description": "Bathroom pipe leakage under sink",
    })

    # Filter by floor 4
    resp_floor4 = client.get("/api/maintenance/board?floor=4")
    assert resp_floor4.status_code == 200
    floor4_issues = resp_floor4.json()["issues"]
    for iss in floor4_issues:
        assert iss["room"]["floor"] == 4

    # Filter by search
    resp_search = client.get("/api/maintenance/board?search=leakage")
    assert resp_search.status_code == 200
    search_issues = resp_search.json()["issues"]
    assert len(search_issues) >= 1
    assert any("leakage" in iss["description"].lower() for iss in search_issues)

    # Filter by completed tab (initially empty)
    resp_comp = client.get("/api/maintenance/board?tab=completed")
    assert resp_comp.status_code == 200
    assert isinstance(resp_comp.json()["issues"], list)


def test_maintenance_detail_by_incident_and_task_id():
    """Verify GET /api/maintenance/{id}/detail works with both incident UUID and task UUID."""
    # 1. Create a critical safety issue
    report_resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 3,
        "reported_by_staff_id": 201,
        "description": "Smoke and sparks coming from electrical outlet near bed",
    })
    assert report_resp.status_code == 202
    report_data = report_resp.json()
    incident_id = report_data["maintenance"]["incident_id"]
    task_id = report_data["maintenance"]["operational_task_id"]

    assert incident_id is not None
    assert task_id is not None

    # 2. Query detail by incident_id
    inc_detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert inc_detail_resp.status_code == 200
    inc_detail = inc_detail_resp.json()

    # Query detail by task_id
    task_detail_resp = client.get(f"/api/maintenance/{task_id}/detail")
    assert task_detail_resp.status_code == 200
    task_detail = task_detail_resp.json()

    # Both should return the exact same incident data
    assert inc_detail["id"] == str(incident_id)
    assert task_detail["id"] == str(incident_id)
    assert inc_detail["task_id"] == str(task_id)

    # Verify detail structure
    header = inc_detail["header"]
    assert header["display_id"].startswith("MT-")
    assert header["room_number"] == "101"
    assert header["severity"] == "CRITICAL"
    assert header["category"] == "ELECTRICAL"
    assert header["reported_by"]["name"] == "Priya Deshmukh"

    # Verify critical safety alert banner
    assert inc_detail["alert"] is not None
    assert "Critical safety issue" in inc_detail["alert"]["title"]

    # Verify AI decision card
    ai_dec = inc_detail["ai_decision"]
    assert ai_dec["safety_rule_applied"] is True
    assert ai_dec["severity"] == "CRITICAL"
    assert ai_dec["sla_minutes"] == 15
    assert ai_dec["technician"] is not None

    # Verify SLA countdown
    sla = inc_detail["sla"]
    assert sla["minutes_total"] == 15
    assert sla["is_breached"] is False
    assert sla["remaining_seconds"] > 0

    # Verify technician card
    assert inc_detail["technician"] is not None
    assert "skills" in inc_detail["technician"]

    # Verify audit trail
    assert len(inc_detail["audit_trail"]) >= 2
    assert inc_detail["allowed_actions"] is not None


def test_maintenance_detail_not_found():
    """Verify GET /api/maintenance/{id}/detail returns 404 for non-existent UUID."""
    fake_uuid = "00000000-0000-0000-0000-000000000099"
    resp = client.get(f"/api/maintenance/{fake_uuid}/detail")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_override_classification_endpoint():
    """Verify POST /api/maintenance/{id}/override-classification updates severity/SLA and logs audit trail."""
    # 1. Report issue (initially categorized)
    report_resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 2,
        "reported_by_staff_id": 201,
        "description": "Water heater leaking slightly in bathroom",
    })
    incident_id = report_resp.json()["maintenance"]["incident_id"]

    # 2. Override classification to CRITICAL / SAFETY
    override_payload = {
        "category": "PLUMBING",
        "severity": "CRITICAL",
        "reason": "Water is leaking near main power socket, severe hazard",
        "staff_id": 201,
    }
    ov_resp = client.post(f"/api/maintenance/{incident_id}/override-classification", json=override_payload)
    assert ov_resp.status_code == 200
    updated_detail = ov_resp.json()

    # Check updated fields
    assert updated_detail["header"]["severity"] == "CRITICAL"
    assert updated_detail["header"]["severity_label"] == "Critical"
    assert updated_detail["sla"]["minutes_total"] == 30
    assert updated_detail["ai_decision"]["needs_review"] is False

    # Check audit trail has HUMAN_OVERRIDE
    audit_events = updated_detail["audit_trail"]
    override_event = next((e for e in audit_events if "Classification overridden" in e["title"]), None)
    assert override_event is not None
    assert "Priya Deshmukh" in override_event["actor_name"]
    assert "severe hazard" in override_event["outcome"]


def test_resolve_maintenance_endpoint():
    """Verify POST /api/maintenance/{id}/resolve completes incident/task and updates room status."""
    repo = PostgresHotelRepository()

    # 1. Report issue on Room 2 with water leakage (affects room readiness)
    report_resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 2,
        "reported_by_staff_id": 201,
        "description": "Water leaking heavily from bathroom ceiling and flooding floor",
    })
    incident_id = report_resp.json()["maintenance"]["incident_id"]

    # Check room status is MAINTENANCE
    room_before = repo.get_room_by_id(2)
    assert room_before.status == RoomStatus.MAINTENANCE

    # 2. Resolve the maintenance issue
    resolve_payload = {
        "staff_id": 302,  # Suresh Pawar
        "notes": "Replaced damaged ceiling pipe coupling and dried floor fixture",
    }
    res_resp = client.post(f"/api/maintenance/{incident_id}/resolve", json=resolve_payload)
    assert res_resp.status_code == 200
    res_data = res_resp.json()

    # Verify incident state
    assert res_data["header"]["status"] == "COMPLETED"
    assert res_data["header"]["status_label"] == "Completed"

    # Verify room is returned to READY (no pending cleaning tasks)
    room_after = repo.get_room_by_id(2)
    assert room_after.status == RoomStatus.READY

    # Verify technician is freed
    tech_after = repo.get_staff_by_id(302)
    assert tech_after.is_available is True
    assert tech_after.active_task_count == 0

    # Verify duplicate resolve returns 409
    dup_resp = client.post(f"/api/maintenance/{incident_id}/resolve", json=resolve_payload)
    assert dup_resp.status_code == 409


def test_safety_category_qualifying_skills_and_technician_reason():
    """Verify SAFETY category maps to ELECTRICAL/GENERAL and builds reason from matched skill."""
    # 1. Report a safety issue in Room 1 (Floor 3)
    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 1,
        "reported_by_staff_id": 201,
        "description": "Room door lock mechanism jammed, cannot latch shut",
    })
    assert resp.status_code == 202
    data = resp.json()
    incident_id = data["maintenance"]["incident_id"]

    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    # Category reason should quote trigger word 'lock' or 'latch'
    ai_dec = detail["ai_decision"]
    assert "lock" in ai_dec["category_reason"].lower() or "latch" in ai_dec["category_reason"].lower() or "safety" in ai_dec["category_reason"].lower()

    # Technician reason must mention the exact matched skill (e.g. ELECTRICAL or GENERAL)
    tech_reason = ai_dec["technician_reason"]
    assert "ELECTRICAL skill" in tech_reason or "GENERAL skill" in tech_reason
    assert "Floor" in tech_reason


def test_technician_availability_in_progress_vs_assigned():
    """Verify technician with ASSIGNED task is AVAILABLE with '1 queued', and BUSY with 'Repairing Room X' when IN_PROGRESS."""
    repo = PostgresHotelRepository()

    # Report issue in Room 2 (Floor 4)
    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 2,
        "reported_by_staff_id": 201,
        "description": "Bathroom pipe leakage under sink",
    })
    assert resp.status_code == 202
    task_id = resp.json()["maintenance"]["operational_task_id"]

    # Board check: technician should be AVAILABLE with queued note
    board_resp = client.get("/api/maintenance/board")
    assert board_resp.status_code == 200
    techs = board_resp.json()["technicians"]
    assigned_tech = next((t for t in techs if t["id"] == resp.json()["maintenance"]["assigned_technician_id"]), None)
    assert assigned_tech is not None
    assert assigned_tech["availability"] == "AVAILABLE"
    assert "queued" in assigned_tech["availability_note"]

    # Start task (move to IN_PROGRESS)
    start_resp = client.post(f"/api/tasks/{task_id}/start")
    assert start_resp.status_code == 200

    # Board check again: technician should now be BUSY with 'Repairing Room 406'
    board_resp_after = client.get("/api/maintenance/board")
    techs_after = board_resp_after.json()["technicians"]
    busy_tech = next((t for t in techs_after if t["id"] == assigned_tech["id"]), None)
    assert busy_tech is not None
    assert busy_tech["availability"] == "BUSY"
    assert "Repairing Room" in busy_tech["availability_note"]


def test_initial_audit_trail_events_on_creation():
    """Verify when an issue is created, real events are logged for reported, classified, severity, task created, staff assigned, and escalation."""
    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 3,
        "reported_by_staff_id": 201,
        "description": "Gas smell and sparks detected near kitchen vent",
    })
    assert resp.status_code == 202
    incident_id = resp.json()["maintenance"]["incident_id"]

    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    events = detail["audit_trail"]
    event_titles = [e["title"] for e in events]

    assert "Issue reported" in event_titles
    assert "Category classified" in event_titles
    assert "Severity assigned" in event_titles
    assert "Task created" in event_titles
    assert "Technician assigned" in event_titles

    # Verify critical issue logged escalation
    assert "Critical escalation recorded" in event_titles or any("escalat" in t.lower() for t in event_titles)


def test_specialist_preferred_over_generalist_across_floors():
    """Verify ELECTRICAL specialist (Suresh on Floor 3) is chosen over GENERAL technician (Rakesh on Floor 4) for a SAFETY issue on Floor 4."""
    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 2,  # Floor 4
        "reported_by_staff_id": 201,
        "description": "Exposed live wiring sparking behind bedside lamp",
        "category": "SAFETY",
        "severity": "CRITICAL",
    })
    assert resp.status_code == 202
    data = resp.json()
    incident_id = data["maintenance"]["incident_id"]
    assigned_tech_id = data["maintenance"]["assigned_technician_id"]

    # Suresh Pawar (ID 302) has ELECTRICAL skill, whereas Rakesh Jadhav (ID 301 on Floor 4) only has GENERAL
    assert assigned_tech_id == 302

    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    ai_dec = detail["ai_decision"]
    assert "ELECTRICAL skill" in ai_dec["technician_reason"]
    assert "assigned from Floor 3" in ai_dec["technician_reason"]
    assert "workload: 0 active tasks" in ai_dec["technician_reason"]


def test_whole_word_keyword_matching_does_not_match_substrings():
    """Verify 'back' does not trigger 'ac' (HVAC) and 'block' does not trigger 'lock' (SAFETY)."""
    from app.agents.maintenance_agent import find_matched_keyword, CAT_KEYWORDS_MAP, MaintenanceAgent
    from app.models.maintenance_issue_report import MaintenanceIssueReport

    # 1. Direct whole-word unit checks on keyword matching function
    assert find_matched_keyword("The back of the chair is loose", CAT_KEYWORDS_MAP[MaintenanceCategory.HVAC]) is None
    assert find_matched_keyword("The back of the chair is loose", CAT_KEYWORDS_MAP[MaintenanceCategory.FURNITURE]) == "chair"
    assert find_matched_keyword("A wooden block is near the entrance", CAT_KEYWORDS_MAP[MaintenanceCategory.SAFETY]) is None
    assert find_matched_keyword("Room door lock is jammed", CAT_KEYWORDS_MAP[MaintenanceCategory.SAFETY]) == "lock"

    # 2. Direct agent report_issue check with category omitted (triggers keyword classifier)
    repo = PostgresHotelRepository()
    agent = MaintenanceAgent(repository=repo)
    res_direct = agent.report_issue(MaintenanceIssueReport(
        room_id=1,
        reported_by_staff_id=201,
        description="The back of the chair is loose and wobbles",
    ))
    assert res_direct.category == MaintenanceCategory.FURNITURE
    inc_row = repo.get_maintenance_incident_by_id(res_direct.incident_id)
    assert inc_row is not None
    assert "chair" in (inc_row.category_reason or "").lower()
    assert "ac" not in (inc_row.category_reason or "").lower()

    # 3. API integration check for SAFETY with 'block' -> should not trigger 'lock'
    resp2 = client.post("/api/events/maintenance-issue", json={
        "room_id": 1,
        "reported_by_staff_id": 201,
        "description": "A block of cement fell from outside wall",
        "category": "GENERAL",
        "severity": "MEDIUM",
    })
    assert resp2.status_code == 202
    inc2_id = resp2.json()["maintenance"]["incident_id"]

    det2 = client.get(f"/api/maintenance/{inc2_id}/detail").json()
    assert det2["header"]["category"] == "GENERAL"
    assert "lock" not in det2["ai_decision"]["category_reason"].lower()


def test_technician_reason_matches_real_staff_row_data():
    """Verify technician_reason reflects the actual staff table row for assigned_floor and active_task_count."""
    repo = PostgresHotelRepository()

    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 1,  # Floor 3
        "reported_by_staff_id": 201,
        "description": "Water pipe dripping under sink basin",
        "category": "PLUMBING",
        "severity": "MEDIUM",
    })
    assert resp.status_code == 202
    incident_id = resp.json()["maintenance"]["incident_id"]
    assigned_tech_id = resp.json()["maintenance"]["assigned_technician_id"]

    # Fetch real staff row from database
    staff_row = repo.get_staff_by_id(assigned_tech_id)
    assert staff_row is not None

    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    tech_reason = detail["ai_decision"]["technician_reason"]

    # Verify technician floor in reason matches staff_row.assigned_floor
    assert f"Floor {staff_row.assigned_floor}" in tech_reason
    assert staff_row.name == detail["ai_decision"]["technician"]["name"]


def test_technician_choice_with_queued_tasks_plumbing():
    """Verify Suresh Pawar (PLUMBING specialist) is chosen for plumbing issue even if he has a queued task."""
    repo = PostgresHotelRepository()

    # Give Suresh (ID 302) 1 queued task
    suresh = repo.get_staff_by_id(302)
    suresh.active_task_count = 1
    # Save in DB
    with repo.session_factory() as session:
        from app.database import StaffEntity
        st = session.get(StaffEntity, 302)
        st.active_task_count = 1
        st.is_available = True
        st.availability_status = "AVAILABLE"
        st.availability_note = "1 queued task"
        session.commit()

    # Report plumbing issue on Room 3 (101 on Floor 1)
    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 3,
        "reported_by_staff_id": 201,
        "description": "Water is leaking from the bathroom tap",
        "category": "PLUMBING",
        "severity": "MEDIUM",
    })
    assert resp.status_code == 202
    data = resp.json()
    incident_id = data["maintenance"]["incident_id"]
    assigned_tech_id = data["maintenance"]["assigned_technician_id"]

    # Suresh Pawar (302) must win because he has PLUMBING skill, while Rakesh (301) only has GENERAL
    assert assigned_tech_id == 302

    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    ai_dec = detail["ai_decision"]
    assert "PLUMBING skill" in ai_dec["technician_reason"]
    assert "Floor 3" in ai_dec["technician_reason"]
    assert detail["technician"]["name"] == "Suresh Pawar"


def test_safety_rule_sparks_word_ending_and_audit_event():
    """Verify 'Sparks coming from the wall socket' triggers safety rule, CRITICAL severity, and audit trail event."""
    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 3,
        "reported_by_staff_id": 201,
        "description": "Sparks coming from the wall socket",
    })
    assert resp.status_code == 202
    incident_id = resp.json()["maintenance"]["incident_id"]

    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    ai_dec = detail["ai_decision"]
    assert ai_dec["safety_rule_applied"] is True
    assert ai_dec["severity"] == "CRITICAL"
    assert ai_dec["safety_rule_text"] is not None
    assert "Safety rule applied" in ai_dec["safety_rule_text"]
    assert "Sparks" in ai_dec["safety_rule_text"]

    # Check audit trail for "Safety rule applied" event
    events = detail["audit_trail"]
    safety_event = next((e for e in events if "Safety rule applied" in e["title"]), None)
    assert safety_event is not None
    assert "Severity elevated to CRITICAL" in safety_event["action"]
    assert "hazard detected" in safety_event["outcome"]



def test_keyword_matching_word_endings_and_boundaries_suite():
    """Verify specific test cases for inflection-aware keyword matching and whole-word boundary preservation."""
    repo = PostgresHotelRepository()
    from app.agents.maintenance_agent import MaintenanceAgent
    from app.models.maintenance_issue_report import MaintenanceIssueReport

    agent = MaintenanceAgent(repository=repo)

    # 1. "Sparks coming from the wall socket" -> category ELECTRICAL, severity CRITICAL, safety_rule_applied True
    res1 = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="Sparks coming from the wall socket",
    ))
    assert res1.category == MaintenanceCategory.ELECTRICAL
    assert res1.severity == MaintenanceSeverity.CRITICAL

    # 2. "Water is leaking from the tap" -> category PLUMBING
    res2 = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="Water is leaking from the tap",
    ))
    assert res2.category == MaintenanceCategory.PLUMBING

    # 3. "The back of the chair is loose" -> category FURNITURE (not HVAC)
    res3 = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="The back of the chair is loose",
    ))
    assert res3.category == MaintenanceCategory.FURNITURE

    # 4. "A block of cement fell" -> category GENERAL (not SAFETY)
    res4 = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="A block of cement fell",
    ))
    assert res4.category == MaintenanceCategory.GENERAL


def test_severity_reason_matches_fired_rule_and_trigger():
    """Verify that severity_reason explicitly names the exact rule and trigger word that fired."""
    repo = PostgresHotelRepository()
    from app.agents.maintenance_agent import MaintenanceAgent
    from app.models.maintenance_issue_report import MaintenanceIssueReport
    from app.models.enums import MaintenanceCategory, MaintenanceSeverity, RoomStatus

    agent = MaintenanceAgent(repository=repo)

    # 1. Water leak rule: "Water is leaking from the bathroom tap"
    res_leak = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="Water is leaking from the bathroom tap",
        category=MaintenanceCategory.PLUMBING,
    ))
    inc_leak = repo.get_maintenance_incident_by_id(res_leak.incident_id)
    assert inc_leak.severity == MaintenanceSeverity.HIGH
    assert "leaking" in inc_leak.severity_reason
    assert "Water leak" in inc_leak.severity_reason
    assert "30-minute" in inc_leak.severity_reason

    # Also verify detail API contains this exact severity reason in ai_decision
    det_leak = client.get(f"/api/maintenance/{inc_leak.id}/detail").json()
    assert "Water leak ('leaking') raises plumbing issues to High" in det_leak["ai_decision"]["severity_reason"]

    # 2. Safety lock rule: "Room door lock mechanism jammed"
    res_lock = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="Room door lock mechanism jammed",
        category=MaintenanceCategory.SAFETY,
    ))
    inc_lock = repo.get_maintenance_incident_by_id(res_lock.incident_id)
    assert inc_lock.severity == MaintenanceSeverity.HIGH
    assert "lock" in inc_lock.severity_reason
    assert "Safety mechanism defect ('lock') raises safety issues to High" in inc_lock.severity_reason

    # 3. Safety alarm trigger: "Security alarm system is beeping continuously"
    res_alarm = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="Security alarm system is beeping continuously",
        category=MaintenanceCategory.SAFETY,
    ))
    inc_alarm = repo.get_maintenance_incident_by_id(res_alarm.incident_id)
    assert inc_alarm.severity == MaintenanceSeverity.HIGH
    assert "alarm" in inc_alarm.severity_reason
    assert "Safety mechanism defect ('alarm') raises safety issues to High" in inc_alarm.severity_reason

    # 4. Critical safety hazard: "Smoke detector is smoking and sparks flying"
    res_smoke = agent.report_issue(MaintenanceIssueReport(
        room_id=3,
        reported_by_staff_id=201,
        description="Smoke detector is smoking and sparks flying",
        category=MaintenanceCategory.SAFETY,
    ))
    inc_smoke = repo.get_maintenance_incident_by_id(res_smoke.incident_id)
    assert inc_smoke.severity == MaintenanceSeverity.CRITICAL
    assert "safety hazard ('smoke') detected" in inc_smoke.severity_reason.lower()

    # 5. Loose chair in a READY room: must stay LOW severity (240 min SLA)
    repo.update_room_status(2, RoomStatus.READY)
    res_chair = agent.report_issue(MaintenanceIssueReport(
        room_id=2,
        reported_by_staff_id=201,
        description="The back of the desk chair is loose",
        category=MaintenanceCategory.FURNITURE,
    ))
    inc_chair = repo.get_maintenance_incident_by_id(res_chair.incident_id)
    assert inc_chair.severity == MaintenanceSeverity.LOW
    assert inc_chair.sla_minutes == 240
    assert "Minor furniture fixture defect" in inc_chair.severity_reason
    assert "loose" in inc_chair.severity_reason


def test_same_sentence_same_severity_and_sla_with_llm_on_and_off(monkeypatch):
    """Verify that the exact same sentence gives the identical severity and SLA whether LLM is on or off."""
    repo = PostgresHotelRepository()
    from app.agents.maintenance_agent import MaintenanceAgent
    from app.models.maintenance_issue_report import MaintenanceIssueReport

    agent = MaintenanceAgent(repository=repo)

    test_sentences = [
        {
            "desc": "Water is leaking from the bathroom tap",
            "llm_category": MaintenanceCategory.PLUMBING,
            "expected_category": MaintenanceCategory.PLUMBING,
            "expected_sev": MaintenanceSeverity.HIGH,
            "expected_sla": 30,
        },
        {
            "desc": "The back of the desk chair is loose",
            "llm_category": MaintenanceCategory.FURNITURE,
            "expected_category": MaintenanceCategory.FURNITURE,
            "expected_sev": MaintenanceSeverity.LOW,
            "expected_sla": 240,
        },
        {
            "desc": "Sparks coming from the wall socket with burning smell",
            "llm_category": MaintenanceCategory.ELECTRICAL,
            "expected_category": MaintenanceCategory.ELECTRICAL,
            "expected_sev": MaintenanceSeverity.CRITICAL,
            "expected_sla": 15,
        },
        {
            "desc": "AC is running but the room is not cooling",
            "llm_category": MaintenanceCategory.HVAC,
            "expected_category": MaintenanceCategory.HVAC,
            "expected_sev": MaintenanceSeverity.HIGH,
            "expected_sla": 30,
        },
        {
            "desc": "The room door lock is jammed and won't open",
            "llm_category": MaintenanceCategory.SAFETY,
            "expected_category": MaintenanceCategory.SAFETY,
            "expected_sev": MaintenanceSeverity.HIGH,
            "expected_sla": 30,
        },
    ]

    for item in test_sentences:
        desc = item["desc"]

        # 1. RUN WITH LLM "ON" (LLM provides classified category)
        res_on = agent.report_issue(MaintenanceIssueReport(
            room_id=3,
            reported_by_staff_id=201,
            description=desc,
            category=item["llm_category"],
        ))
        inc_on = repo.get_maintenance_incident_by_id(res_on.incident_id)

        # 2. RUN WITH LLM "OFF" (LLM is off / category is None, resolved by rule engine)
        res_off = agent.report_issue(MaintenanceIssueReport(
            room_id=3,
            reported_by_staff_id=201,
            description=desc,
            category=None,
        ))
        inc_off = repo.get_maintenance_incident_by_id(res_off.incident_id)

        # Assert BOTH give identical category, severity, SLA, and reasons
        assert inc_on.category == item["expected_category"]
        assert inc_off.category == item["expected_category"]

        assert inc_on.severity == item["expected_sev"], f"LLM ON sev mismatch for '{desc}': {inc_on.severity} != {item['expected_sev']}"
        assert inc_off.severity == item["expected_sev"], f"LLM OFF sev mismatch for '{desc}': {inc_off.severity} != {item['expected_sev']}"
        assert inc_on.severity == inc_off.severity

        assert inc_on.sla_minutes == item["expected_sla"], f"LLM ON SLA mismatch for '{desc}': {inc_on.sla_minutes} != {item['expected_sla']}"
        assert inc_off.sla_minutes == item["expected_sla"], f"LLM OFF SLA mismatch for '{desc}': {inc_off.sla_minutes} != {item['expected_sla']}"
        assert inc_on.sla_minutes == inc_off.sla_minutes


def test_llm_cannot_inflate_severity_above_rule_table(monkeypatch):
    """Verify that even if the LLM classifier returns CRITICAL, SEVERITY_RULES strictly governs severity & SLA."""
    from app.agents.issue_classifier_agent import IssueClassifierAgent

    # Mock LLM to return CRITICAL for jammed door lock
    def mock_classify(self, desc):
        return {
            "is_valid_issue": True,
            "category": MaintenanceCategory.SAFETY,
            "severity": MaintenanceSeverity.CRITICAL,
            "affects_room_readiness": True,
        }

    monkeypatch.setattr(IssueClassifierAgent, "classify", mock_classify)

    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 10,
        "reported_by_staff_id": 201,
        "description": "The room door lock is jammed and will not open",
    })
    assert resp.status_code == 202
    data = resp.json()

    # Rule table specifies SAFETY_LOCK_OR_ALARM -> HIGH (30 mins SLA)
    assert data["severity"] == "HIGH"
    assert data["sla_minutes"] == 30

    incident_id = data["incident_id"]
    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    # Verify AI decision fields
    ai_dec = detail["ai_decision"]
    assert ai_dec["severity"] == "HIGH"
    assert ai_dec["decision_source"] == "RULE_TABLE"
    assert ai_dec["confidence"] == "Rule-based"
    assert ai_dec["safety_rule_applied"] is False
    assert ai_dec["safety_rule_text"] is None
    assert "Safety mechanism defect" in ai_dec["severity_reason"]

    # Red alert must NOT be present
    assert detail["alert"] is None

    # Escalation audit event must NOT be logged
    audit_titles = [a["title"] for a in detail["audit_trail"]]
    assert "Critical escalation recorded" not in audit_titles


def test_locked_inside_guest_triggers_critical_safety_rule():
    """Verify that guest trapped/locked inside triggers SAFETY_GUEST_TRAPPED rule (CRITICAL, 15m SLA, red alert)."""
    resp = client.post("/api/events/maintenance-issue", json={
        "room_id": 10,
        "reported_by_staff_id": 201,
        "description": "Guest is trapped and locked inside the room, cannot get out",
    })
    assert resp.status_code == 202
    data = resp.json()

    assert data["severity"] == "CRITICAL"
    assert data["sla_minutes"] == 15

    incident_id = data["incident_id"]
    detail_resp = client.get(f"/api/maintenance/{incident_id}/detail")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    ai_dec = detail["ai_decision"]
    assert ai_dec["severity"] == "CRITICAL"
    assert ai_dec["decision_source"] == "RULE_TABLE"
    assert ai_dec["safety_rule_applied"] is True
    assert "trapped" in ai_dec["severity_reason"] or "locked inside" in ai_dec["severity_reason"]

    # Red alert MUST be present
    assert detail["alert"] is not None
    assert "Critical safety issue" in detail["alert"]["title"]

    # Escalation audit event MUST be logged
    audit_titles = [a["title"] for a in detail["audit_trail"]]
    assert "Critical escalation recorded" in audit_titles






