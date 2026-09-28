import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from app.agents.issue_classifier_agent import ClassificationError, IssueClassifierAgent
from app.models.enums import MaintenanceCategory, MaintenanceSeverity

SAMPLE_VALID_DESCRIPTIONS = [
    ("AC is running but the room is not cooling.", MaintenanceCategory.HVAC, MaintenanceSeverity.MEDIUM),
    ("Sparks flying from bedside electrical outlet with burning smell.", MaintenanceCategory.ELECTRICAL, MaintenanceSeverity.CRITICAL),
    ("Water leaking heavily from bathroom ceiling and flooding floor.", MaintenanceCategory.PLUMBING, MaintenanceSeverity.CRITICAL),
    ("Room door lock mechanism is jammed and won't latch shut.", MaintenanceCategory.SAFETY, MaintenanceSeverity.HIGH),
]

SAMPLE_INVALID_DESCRIPTIONS = [
    "dd fbhcy bcgd bchdh bchyd",
    "I need a water bottle",
    "Can you bring extra towels to room 102?",
]


def test_issue_classifier_agent_valid_descriptions():
    agent = IssueClassifierAgent()
    print("\n" + "=" * 70)
    print("TESTING IssueClassifierAgent.classify() ON VALID DESCRIPTIONS")
    print("=" * 70)

    for idx, (desc, expected_cat, expected_sev) in enumerate(SAMPLE_VALID_DESCRIPTIONS, 1):
        print(f"\n[Valid Test Case {idx}/{len(SAMPLE_VALID_DESCRIPTIONS)}]")
        print(f"  Input Description : \"{desc}\"")

        res = agent.classify(desc)

        print(f"  Returned Result   : {res}")
        assert isinstance(res, dict), f"Expected dict result, got {type(res)}"
        assert res.get("is_valid_issue") is True
        assert isinstance(res.get("category"), MaintenanceCategory)
        assert isinstance(res.get("severity"), MaintenanceSeverity)
        assert isinstance(res.get("affects_room_readiness"), bool)

        print("  Status            : PASS")


def test_issue_classifier_agent_invalid_descriptions():
    agent = IssueClassifierAgent()
    print("\n" + "=" * 70)
    print("TESTING IssueClassifierAgent.classify() ON INVALID DESCRIPTIONS")
    print("=" * 70)

    for idx, desc in enumerate(SAMPLE_INVALID_DESCRIPTIONS, 1):
        print(f"\n[Invalid Test Case {idx}/{len(SAMPLE_INVALID_DESCRIPTIONS)}]")
        print(f"  Input Description : \"{desc}\"")

        res = agent.classify(desc)

        print(f"  Returned Result   : {res}")
        assert isinstance(res, dict), f"Expected dict result, got {type(res)}"
        assert res.get("is_valid_issue") is False
        assert res.get("category") is None
        assert res.get("severity") is None
        assert res.get("affects_room_readiness") is None

        print("  Status            : PASS")



def test_issue_classifier_agent_empty_description_error():
    agent = IssueClassifierAgent()
    with pytest.raises(ClassificationError, match="empty"):
        agent.classify("   ")


def test_classify_with_fallback_normal():
    agent = IssueClassifierAgent()
    desc = "Desk chair leg is wobbly and loose."
    is_valid, cat, sev, needs_review = agent.classify_with_fallback(desc)

    print(f"\n[Normal Fallback Test]")
    print(f"  Input Description : \"{desc}\"")
    print(f"  Output            : is_valid={is_valid}, category={cat.value if cat else None}, severity={sev.value if sev else None}, needs_human_review={needs_review}")

    assert is_valid is True
    assert cat == MaintenanceCategory.FURNITURE
    assert sev == MaintenanceSeverity.LOW
    assert needs_review is False
    print("  Status            : PASS")


def test_classify_with_fallback_invalid_issue():
    agent = IssueClassifierAgent()
    desc = "dd fbhcy bcgd bchdh"
    is_valid, cat, sev, needs_review = agent.classify_with_fallback(desc)

    print(f"\n[Invalid Issue Fallback Test]")
    print(f"  Input Description : \"{desc}\"")
    print(f"  Output            : is_valid={is_valid}, category={cat}, severity={sev}, needs_human_review={needs_review}")

    assert is_valid is False
    assert cat is None
    assert sev is None
    assert needs_review is False
    print("  Status            : PASS")


def test_classify_with_fallback_safety_keyword():
    agent = IssueClassifierAgent()
    desc = "There is a strong gas smell coming from the heater unit."
    is_valid, cat, sev, needs_review = agent.classify_with_fallback(desc)

    print(f"\n[Safety Keyword Override Test]")
    print(f"  Input Description : \"{desc}\"")
    print(f"  Output            : is_valid={is_valid}, category={cat.value if cat else None}, severity={sev.value if sev else None}, needs_human_review={needs_review}")

    assert is_valid is True
    assert sev == MaintenanceSeverity.CRITICAL
    assert needs_review is True

    override_logs = [log for log in agent.activity_logs if log.get("action") == "SAFETY_OVERRIDE"]
    assert len(override_logs) > 0, "Expected SAFETY_OVERRIDE entry in activity_logs"
    print(f"  Logged Action     : {override_logs[0]}")
    print("  Status            : PASS")


def test_classify_with_fallback_llm_failure():
    # Point to an invalid unreachable port to simulate LLM failure
    agent = IssueClassifierAgent(ollama_url="http://localhost:59999/api/generate", timeout=1.0)
    desc = "AC is completely broken and leaking water."
    is_valid, cat, sev, needs_review = agent.classify_with_fallback(desc)

    print(f"\n[LLM Failure Fallback Test]")
    print(f"  Input Description : \"{desc}\"")
    print(f"  Output            : is_valid={is_valid}, category={cat.value if cat else None}, severity={sev.value if sev else None}, needs_human_review={needs_review}")

    assert is_valid is True
    assert cat == MaintenanceCategory.GENERAL
    assert sev == MaintenanceSeverity.MEDIUM
    assert needs_review is True

    fallback_logs = [log for log in agent.activity_logs if log.get("action") == "CLASSIFICATION_FALLBACK"]
    assert len(fallback_logs) > 0, "Expected CLASSIFICATION_FALLBACK entry in activity_logs"
    print(f"  Logged Action     : {fallback_logs[0]}")
    print("  Status            : PASS")


from unittest.mock import MagicMock
from app.agents.orchestrator_agent import OperationsOrchestratorAgent
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.models.domain import Room


def test_orchestrator_stops_on_invalid_issues():
    # Setup mock repository with valid room
    mock_repo = MagicMock()
    mock_room = MagicMock()
    mock_room.id = 101
    mock_repo.get_room_by_id.return_value = mock_room

    classifier_agent = IssueClassifierAgent()
    orchestrator = OperationsOrchestratorAgent(repository=mock_repo, classifier_agent=classifier_agent)

    # Test Case 1: Gibberish text
    invalid_report_1 = MaintenanceIssueReport(
        room_id=101,
        reported_by_staff_id=1,
        description="dd fbhcy bcgd bchdh",
    )
    with pytest.raises(ValueError, match="Please provide a valid maintenance issue description."):
        orchestrator.process_maintenance_report(invalid_report_1)

    # Test Case 2: Non-maintenance request
    invalid_report_2 = MaintenanceIssueReport(
        room_id=101,
        reported_by_staff_id=1,
        description="I need a water bottle",
    )
    with pytest.raises(ValueError, match="Please provide a valid maintenance issue description."):
        orchestrator.process_maintenance_report(invalid_report_2)

    # Test Case 3: Valid issue
    valid_report = MaintenanceIssueReport(
        room_id=101,
        reported_by_staff_id=1,
        description="AC is not cooling",
    )
    result = orchestrator.process_maintenance_report(valid_report)
    assert result.status == "ROUTED"
    assert result.next_agent == "MAINTENANCE_AGENT"
    assert valid_report.category == MaintenanceCategory.HVAC


def test_affects_room_readiness_safe_fallback():
    agent = IssueClassifierAgent()
    # Mock _call_llm returning valid issue without affects_room_readiness key
    agent._call_llm = MagicMock(return_value='{"is_valid_issue": true, "category": "ELECTRICAL", "severity": "LOW"}')
    res = agent.classify("Bulb is fused")
    assert res["is_valid_issue"] is True
    assert res["category"] == MaintenanceCategory.ELECTRICAL
    assert res["severity"] == MaintenanceSeverity.LOW
    assert res["affects_room_readiness"] is True, "Expected missing affects_room_readiness to safely fallback to True"


def test_issue_classifier_response_schema_defaults():
    from app.schemas.agent import IssueClassifierResponse

    # Valid issue with missing affects_room_readiness -> defaults to True
    resp_valid = IssueClassifierResponse(
        is_valid_issue=True,
        category=MaintenanceCategory.HVAC,
        severity=MaintenanceSeverity.HIGH,
    )
    assert resp_valid.affects_room_readiness is True

    # Valid issue with explicit False
    resp_false = IssueClassifierResponse(
        is_valid_issue=True,
        category=MaintenanceCategory.ELECTRICAL,
        severity=MaintenanceSeverity.LOW,
        affects_room_readiness=False,
    )
    assert resp_false.affects_room_readiness is False

    # Invalid issue -> affects_room_readiness remains None
    resp_invalid = IssueClassifierResponse(
        is_valid_issue=False,
    )
    assert resp_invalid.affects_room_readiness is None


def test_maintenance_incident_persists_affects_room_readiness():
    from app.models.maintenance_incident import MaintenanceIncident
    from app.agents.maintenance_agent import MaintenanceAgent

    mock_repo = MagicMock()
    mock_room = MagicMock()
    mock_room.id = 1
    mock_room.status = "DIRTY"
    mock_room.floor = 4
    mock_repo.get_room_by_id.return_value = mock_room
    mock_staff = MagicMock()
    mock_staff.id = 201
    mock_staff.role = "HOUSEKEEPING"
    mock_repo.staff = {201: mock_staff}
    mock_tech = MagicMock()
    mock_tech.id = 301
    mock_tech.name = "Rakesh Jadhav"
    mock_tech.assigned_floor = 4
    mock_tech.active_task_count = 0
    mock_repo.get_available_maintenance_staff.return_value = [mock_tech]
    mock_repo.save_maintenance_incident.side_effect = lambda inc: inc
    mock_repo.save_operational_task.side_effect = lambda task: task
    mock_repo.assign_task_to_staff.side_effect = lambda tid, sid: MagicMock(id=tid, status="ASSIGNED")
    mock_repo.assign_incident_to_technician.side_effect = lambda iid, tid: MaintenanceIncident(
        id=iid,
        room_id=1,
        reported_by_staff_id=201,
        description="Leaking water from pipe",
        category=MaintenanceCategory.PLUMBING,
        severity=MaintenanceSeverity.HIGH,
        affects_room_readiness=True,
        sla_minutes=30,
    )

    agent = MaintenanceAgent(mock_repo)
    report = MaintenanceIssueReport(
        room_id=1,
        reported_by_staff_id=201,
        description="Leaking water from pipe",
        category=MaintenanceCategory.PLUMBING,
        severity=MaintenanceSeverity.HIGH,
        affects_room_readiness=True,
    )
    res = agent.report_issue(report)
    assert res.incident_id is not None
    assert mock_repo.save_maintenance_incident.called
    saved_incident = mock_repo.save_maintenance_incident.call_args_list[0][0][0]
    assert saved_incident.affects_room_readiness is True


def test_orchestrator_hold_and_release_housekeeping_task():
    from app.models.operational_task import OperationalTask
    from app.models.enums import TaskStatus, TaskType

    mock_repo = MagicMock()
    mock_room = MagicMock()
    mock_room.id = 1
    mock_room.status = "DIRTY"
    mock_repo.get_room_by_id.return_value = mock_room

    cleaning_task = OperationalTask(
        room_id=1,
        task_type=TaskType.ROOM_CLEANING,
        priority_score=50,
        priority_level="HIGH",
        status=TaskStatus.ASSIGNED,
        assigned_staff_id=201,
    )
    mock_repo.operational_tasks = {cleaning_task.id: cleaning_task}
    mock_repo.save_operational_task.side_effect = lambda t: t

    classifier = MagicMock()
    classifier.classify.return_value = {
        "is_valid_issue": True,
        "category": MaintenanceCategory.PLUMBING,
        "severity": MaintenanceSeverity.HIGH,
        "affects_room_readiness": True,
    }

    orchestrator = OperationsOrchestratorAgent(repository=mock_repo, classifier_agent=classifier)

    report = MaintenanceIssueReport(
        room_id=1,
        reported_by_staff_id=201,
        description="Heavy bathroom leak",
        category=MaintenanceCategory.PLUMBING,
        severity=MaintenanceSeverity.HIGH,
        affects_room_readiness=True,
    )

    # 1. Process maintenance report -> should place housekeeping task ON_HOLD
    result = orchestrator.process_maintenance_report(report)
    assert result.workflow_name == "MAINTENANCE_FIRST_TURNAROUND"
    assert cleaning_task.status == TaskStatus.ON_HOLD

    hold_logs = [log for log in orchestrator.activity_logs if log.get("action") == "HOLD_HOUSEKEEPING_TASK"]
    assert len(hold_logs) == 1
    assert hold_logs[0]["new_task_status"] == "ON_HOLD"

    # 2. Complete maintenance -> should release housekeeping task back to ASSIGNED
    release_res = orchestrator.handle_maintenance_completed(room_id=1)
    assert release_res.workflow_name == "POST_MAINTENANCE_HOUSEKEEPING"
    assert cleaning_task.status == TaskStatus.ASSIGNED

    release_logs = [log for log in orchestrator.activity_logs if log.get("action") == "RELEASE_HOUSEKEEPING_TASK"]
    assert len(release_logs) == 1
    assert release_logs[0]["new_task_status"] == "ASSIGNED"


if __name__ == "__main__":
    test_issue_classifier_agent_valid_descriptions()
    test_issue_classifier_agent_invalid_descriptions()
    test_classify_with_fallback_normal()
    test_classify_with_fallback_invalid_issue()
    test_classify_with_fallback_safety_keyword()
    test_classify_with_fallback_llm_failure()
    test_orchestrator_stops_on_invalid_issues()
    test_affects_room_readiness_safe_fallback()
    test_issue_classifier_response_schema_defaults()
    test_maintenance_incident_persists_affects_room_readiness()
    test_orchestrator_hold_and_release_housekeeping_task()





