import re
import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from typing import Optional

from app.config import (
    BASELINE_SEVERITY_BY_CATEGORY,
    CATEGORY_SKILLS_MAPPING,
    SEVERITY_RULES,
    get_critical_safety_triggers,
    settings,
)
from app.models.enums import (
    IncidentStatus,
    MaintenanceCategory,
    MaintenanceResultStatus,
    MaintenanceSeverity,
    MaintenanceSkill,
    RoomStatus,
    StaffRole,
    TaskStatus,
    TaskType,
)
from app.models.maintenance_incident import MaintenanceIncident
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.models.maintenance_result import MaintenanceResult
from app.models.operational_task import OperationalTask
from app.models.staff import Staff

CAT_KEYWORDS_MAP = {
    MaintenanceCategory.HVAC: ("ac", "air conditioning", "cooling", "heating", "thermostat", "airflow", "ventilation", "filter", "chiller", "radiator"),
    MaintenanceCategory.ELECTRICAL: ("spark", "outlet", "socket", "wire", "wiring", "shock", "light", "switch", "power", "fuse", "breaker", "bulb", "lamp"),
    MaintenanceCategory.PLUMBING: ("leak", "water", "pipe", "toilet", "drain", "sink", "faucet", "shower", "flooding", "clog", "flush", "tap"),
    MaintenanceCategory.SAFETY: ("gas", "smoke", "fire", "hazard", "security", "emergency", "lock", "alarm", "latched", "latch", "detector", "keycard"),
    MaintenanceCategory.FURNITURE: ("chair", "table", "bed", "desk", "drawer", "curtain", "couch", "sofa", "closet", "cabinet", "woodwork", "wardrobe"),
    MaintenanceCategory.GENERAL: ("paint", "wall", "carpet", "tile", "crack", "general", "stain"),
}


def build_keyword_pattern(kw: str) -> str:
    """Build a word-boundary regex pattern that matches the keyword and its common English inflections (s, es, ed, ing, d),
    while ensuring it never matches inside another word (e.g. 'back' must not match 'ac', 'block' must not match 'lock').
    """
    clean_kw = kw.strip()
    # Acronym / abbreviations like "ac" should only match exact word or plural (e.g. ac, acs, a/c)
    if clean_kw.lower() == "ac":
        return r"\b(?:ac|a/c|a\.c\.|acs)\b"

    # Multi-word phrases like "air conditioning", "electric shock"
    if " " in clean_kw:
        words = clean_kw.split()
        pattern_words = []
        for i, w in enumerate(words):
            if i == len(words) - 1:
                if w.endswith("e"):
                    base = re.escape(w[:-1])
                    pattern_words.append(rf"{base}(?:e|es|ed|ing|ings|d)?")
                else:
                    pattern_words.append(rf"{re.escape(w)}(?:s|es|ed|ing|ings|d)?")
            else:
                pattern_words.append(re.escape(w))
        return r"\b" + r"\s+".join(pattern_words) + r"\b"

    # Words ending in 'e' (like smoke, wire, fuse, chiller) -> smok(e|es|ed|ing|ings|d)
    if clean_kw.endswith("e"):
        base = re.escape(clean_kw[:-1])
        return r"\b" + base + r"(?:e|es|ed|ing|ings|d)?\b"

    # Words ending in 'y' preceded by consonant (like battery) -> batter(y|ies)
    if clean_kw.endswith("y") and len(clean_kw) > 2 and clean_kw[-2] not in "aeiou":
        base = re.escape(clean_kw[:-1])
        return r"\b(?:" + re.escape(clean_kw) + r"|" + base + r"ies)\b"

    # Standard words (like spark, leak, lock, drain, sink, pipe, flood, flush, clog, chair, paint, stain, crack)
    return r"\b" + re.escape(clean_kw) + r"(?:s|es|ed|ing|ings|d)?\b"


def find_matched_keyword(text: str, keywords: tuple[str, ...]) -> Optional[str]:
    """Find first keyword that matches in text using whole word boundary and inflection-aware regex."""
    if not text:
        return None
    for kw in keywords:
        pattern = build_keyword_pattern(kw)
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(0)
    return None


class MaintenanceAgent:
    def __init__(self, repository):
        self.repository = repository
        self.activity_logs = []

    def _calculate_sla(self, severity: MaintenanceSeverity) -> int:
        sla_mapping = {
            MaintenanceSeverity.CRITICAL: 15,
            MaintenanceSeverity.HIGH: 30,
            MaintenanceSeverity.MEDIUM: 60,
            MaintenanceSeverity.LOW: 240,
        }
        return sla_mapping.get(severity, 240)

    def _get_qualifying_skills(self, category: MaintenanceCategory) -> list[MaintenanceSkill]:
        cat_key = category.value if hasattr(category, "value") else str(category)
        skill_names = CATEGORY_SKILLS_MAPPING.get(cat_key.upper(), ["GENERAL"])
        return [MaintenanceSkill(s) for s in skill_names]

    def _get_required_skill(self, category: MaintenanceCategory) -> MaintenanceSkill:
        skills = self._get_qualifying_skills(category)
        specialist = [s for s in skills if s != MaintenanceSkill.GENERAL]
        return specialist[0] if specialist else MaintenanceSkill.GENERAL

    def _select_best_technician(
        self,
        candidates: list[Staff],
        room_floor: Optional[int],
        qualifying_skills: Optional[list[MaintenanceSkill]] = None,
    ) -> Optional[Staff]:
        if not candidates:
            return None

        specialist_skills = [s for s in (qualifying_skills or []) if s != MaintenanceSkill.GENERAL]

        def candidate_sort_key(c: Staff):
            # 1. Specialist skill match: 0 if technician has specialist skill, 1 if technician only has GENERAL
            has_specialist = any(sk in c.skills for sk in specialist_skills) if specialist_skills else (MaintenanceSkill.GENERAL in c.skills)
            skill_rank = 0 if has_specialist else 1

            # 2. Floor distance (nearest floor wins)
            floor_dist = abs(c.assigned_floor - room_floor) if (room_floor is not None and c.assigned_floor is not None) else 0

            # 3. Workload
            workload = c.active_task_count or 0

            # 4. Tie-breaker
            return (skill_rank, floor_dist, workload, c.id)

        return min(candidates, key=candidate_sort_key)


    def report_issue(self, issue: MaintenanceIssueReport) -> MaintenanceResult:
        # 1. Look up room
        room = self.repository.get_room_by_id(issue.room_id)
        if not room:
            raise ValueError("Room not found")

        # 2. Look up reporting staff member (if staff_id provided)
        reporting_staff = None
        if issue.reported_by_staff_id is not None:
            if hasattr(self.repository, "get_staff_by_id"):
                reporting_staff = self.repository.get_staff_by_id(issue.reported_by_staff_id)
            elif hasattr(self.repository, "staff"):
                reporting_staff = self.repository.staff.get(issue.reported_by_staff_id)
            if not reporting_staff:
                raise ValueError("Reporting staff not found")
            allowed_roles = (StaffRole.HOUSEKEEPING, StaffRole.MAINTENANCE, "SUPERVISOR", "MANAGER")
            if str(reporting_staff.role).upper() not in [str(r).upper() for r in allowed_roles]:
                raise ValueError("Only hotel staff, supervisors or managers can report maintenance issues")

        # 4. Check room current status
        valid_statuses = (
            RoomStatus.CLEANING,
            RoomStatus.DIRTY,
            RoomStatus.READY,
            RoomStatus.OCCUPIED,
            RoomStatus.MAINTENANCE,
        )
        valid_status_values = (
            RoomStatus.CLEANING.value,
            RoomStatus.DIRTY.value,
            RoomStatus.READY.value,
            RoomStatus.OCCUPIED.value,
            RoomStatus.MAINTENANCE.value,
        )
        if room.status not in valid_statuses and room.status not in valid_status_values:
            raise ValueError(f"Room status {room.status} does not allow reporting a maintenance issue")

        # 5. Save previous status
        previous_status = room.status.value if hasattr(room.status, "value") else str(room.status)

        # Resolve category if not provided
        if issue.category is None:
            for cat, kws in CAT_KEYWORDS_MAP.items():
                if find_matched_keyword(issue.description or "", kws):
                    issue.category = cat
                    break
            if issue.category is None:
                issue.category = MaintenanceCategory.GENERAL

        cat_str = issue.category.value if hasattr(issue.category, "value") else str(issue.category)

        # Match named severity rules from config.py
        matched_rule = None
        matched_rule_trigger = None
        for rule in SEVERITY_RULES:
            rule_cat = rule.get("category")
            if rule_cat is None or rule_cat == cat_str:
                m_kw = find_matched_keyword(issue.description or "", rule.get("triggers", []))
                if m_kw:
                    matched_rule = rule
                    matched_rule_trigger = m_kw
                    break

        # Check if human override is explicitly specified
        is_human_override = getattr(issue, "is_human_override", False)

        if is_human_override and issue.severity is not None:
            sev_val = issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity)
            decision_source = "HUMAN_OVERRIDE"
            confidence_score = "Rule-based"
            sev_reason = issue.severity_reason or f"Severity set to {sev_val} by human override."
            safety_rule_applied = (sev_val == "CRITICAL")
            safety_rule_text = issue.safety_rule_text
            sla_minutes = self._calculate_sla(issue.severity)
        elif matched_rule:
            issue.severity = MaintenanceSeverity(matched_rule["severity"])
            sev_val = matched_rule["severity"]
            decision_source = "RULE_TABLE"
            confidence_score = "Rule-based"
            sla_minutes = matched_rule.get("sla_minutes") or self._calculate_sla(issue.severity)
            sev_reason = matched_rule["reason_template"].format(trigger=matched_rule_trigger)
            safety_rule_applied = (sev_val == "CRITICAL")
            if safety_rule_applied:
                safety_rule_text = f"Safety rule applied: '{matched_rule_trigger}' hazard detected. {sev_reason}"
            else:
                safety_rule_text = None
        elif cat_str in BASELINE_SEVERITY_BY_CATEGORY:
            base_sev, base_sla, base_reason = BASELINE_SEVERITY_BY_CATEGORY[cat_str]
            issue.severity = MaintenanceSeverity(base_sev)
            sev_val = base_sev
            decision_source = "RULE_TABLE"
            confidence_score = "Rule-based"
            sla_minutes = base_sla
            sev_reason = base_reason
            safety_rule_applied = (sev_val == "CRITICAL")
            safety_rule_text = None
        else:
            issue.severity = MaintenanceSeverity.MEDIUM
            sev_val = "MEDIUM"
            decision_source = "FALLBACK"
            confidence_score = None
            sla_minutes = 60
            sev_reason = "Defect requires technical repair with moderate inconvenience (60-minute target SLA)."
            safety_rule_applied = False
            safety_rule_text = None

        # Evaluate housekeeping blocking rule
        from app.config import evaluate_blocks_housekeeping
        if issue.blocks_housekeeping is not None:
            blocks_housekeeping = bool(issue.blocks_housekeeping)
            hold_reason = issue.housekeeping_hold_reason or ("Manager override" if is_human_override else "Manual flag")
        else:
            blocks_housekeeping, hold_reason = evaluate_blocks_housekeeping(
                category=cat_str,
                severity=sev_val,
                description=issue.description or "",
                is_safety_rule_applied=safety_rule_applied,
            )

        issue.blocks_housekeeping = blocks_housekeeping
        issue.housekeeping_hold_reason = hold_reason
        issue.affects_room_readiness = blocks_housekeeping

        # 6. Update room status to MAINTENANCE only if blocks_housekeeping is True and room is not OCCUPIED
        if previous_status != RoomStatus.OCCUPIED.value and blocks_housekeeping:
            if previous_status != RoomStatus.MAINTENANCE.value:
                self.repository.update_room_status(issue.room_id, RoomStatus.MAINTENANCE)
            new_room_status_enum = RoomStatus.MAINTENANCE
        else:
            new_room_status_enum = room.status if isinstance(room.status, RoomStatus) else RoomStatus(previous_status)

        new_status_str = new_room_status_enum.value if hasattr(new_room_status_enum, "value") else str(new_room_status_enum)

        # 8. Calculate qualifying skills
        qualifying_skills = self._get_qualifying_skills(issue.category)

        # Generate dynamic category reason quoting description words
        cat_match = find_matched_keyword(issue.description or "", CAT_KEYWORDS_MAP.get(issue.category, ()))
        if issue.category_reason:
            cat_reason = issue.category_reason
        elif cat_match:
            cat_reason = f"Identified '{cat_match}' in description, classified as {issue.category.value.title()}."
        else:
            cat_reason = f"Issue involves {issue.category.value.lower()} maintenance based on reported details."

        is_fallback = bool(issue.is_fallback)
        needs_human_review = bool(issue.needs_human_review or is_fallback or safety_rule_applied)

        # 9. Create and save MaintenanceIncident
        incident = MaintenanceIncident(
            room_id=issue.room_id,
            reported_by_staff_id=issue.reported_by_staff_id,
            description=issue.description,
            category=issue.category,
            severity=issue.severity,
            affects_room_readiness=blocks_housekeeping,
            blocks_housekeeping=blocks_housekeeping,
            housekeeping_hold_reason=hold_reason,
            sla_minutes=sla_minutes,
            category_reason=cat_reason,
            severity_reason=sev_reason,
            confidence_score=confidence_score,
            decision_source=decision_source,
            safety_rule_applied=safety_rule_applied,
            safety_rule_text=safety_rule_text,
            is_fallback=is_fallback,
            needs_human_review=needs_human_review,
        )
        saved_incident = self.repository.save_maintenance_incident(incident)


        # 10. Get candidate technicians & select best one using qualifying skills
        candidates = self.repository.get_available_maintenance_staff(qualifying_skills, room.floor)
        technician = self._select_best_technician(candidates, room.floor, qualifying_skills)

        # 11. IF technician was found
        if technician:
            severity_priority_map = {
                MaintenanceSeverity.CRITICAL: (100, "CRITICAL"),
                MaintenanceSeverity.HIGH: (80, "HIGH"),
                MaintenanceSeverity.MEDIUM: (50, "MEDIUM"),
                MaintenanceSeverity.LOW: (20, "NORMAL"),
            }
            priority_score, priority_level = severity_priority_map.get(issue.severity, (20, "NORMAL"))

            matched_skill = next((sk for sk in qualifying_skills if sk in technician.skills), MaintenanceSkill.GENERAL)
            match_reason = (
                f"{matched_skill.value} skill, on Floor {technician.assigned_floor}, nearest qualified technician"
                if technician.assigned_floor == room.floor
                else f"{matched_skill.value} skill, assigned from Floor {technician.assigned_floor} (workload: {technician.active_task_count} active tasks)"
            )

            original_decision = {
                "category": issue.category.value if hasattr(issue.category, "value") else str(issue.category),
                "severity": issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity),
                "sla_minutes": sla_minutes,
                "technician_id": technician.id,
                "technician_name": technician.name,
            }

            task = OperationalTask(
                task_type=TaskType.ROOM_MAINTENANCE,
                room_id=issue.room_id,
                priority_score=priority_score,
                priority_level=priority_level,
                status=TaskStatus.PENDING,
                notes=issue.description,
            )
            saved_task = self.repository.save_operational_task(task)

            self.repository.assign_task_to_staff(saved_task.id, technician.id)
            updated_incident = self.repository.assign_incident_to_technician(saved_incident.id, technician.id)

            updated_incident.operational_task_id = saved_task.id
            updated_incident.technician_match_reason = match_reason
            updated_incident.original_ai_decision = original_decision
            self.repository.save_maintenance_incident(updated_incident)

            if hasattr(self.repository, "log_activity"):
                cat_val = issue.category.value if hasattr(issue.category, "value") else str(issue.category)
                sev_val = issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity)
                if reporting_staff:
                    actor_name = reporting_staff.name
                    rep_role = reporting_staff.role.value if hasattr(reporting_staff.role, "value") else str(reporting_staff.role)
                else:
                    actor_name = getattr(issue, "reporter_name", None) or "Amit Shah"
                    rep_role = getattr(issue, "reporter_role", None) or "MANAGER"

                # 1. Issue reported
                self.repository.log_activity(
                    task_id=saved_task.id,
                    room_id=issue.room_id,
                    event_type="ISSUE_REPORTED",
                    title="Issue reported",
                    actor_name=actor_name,
                    actor_role=rep_role,
                    action=f"Reported issue in Room {room.room_number}",
                    outcome=f'"{issue.description}"',
                )
                # 2. Category classified
                self.repository.log_activity(
                    task_id=saved_task.id,
                    room_id=issue.room_id,
                    event_type="CATEGORY_CLASSIFIED",
                    title="Category classified",
                    actor_name="Maintenance Agent",
                    actor_role="AI Agent",
                    action=f"Category set to {cat_val}",
                    outcome=cat_reason,
                )
                # 3. Severity assigned
                self.repository.log_activity(
                    task_id=saved_task.id,
                    room_id=issue.room_id,
                    event_type="SEVERITY_ASSIGNED",
                    title="Severity assigned",
                    actor_name="Maintenance Agent",
                    actor_role="AI Agent",
                    action=f"Severity set to {sev_val} ({sla_minutes}m SLA)",
                    outcome=sev_reason,
                )
                # 4. Safety rule applied (if triggered)
                if safety_rule_applied:
                    self.repository.log_activity(
                        task_id=saved_task.id,
                        room_id=issue.room_id,
                        event_type="SAFETY_RULE_APPLIED",
                        title="Safety rule applied",
                        actor_name="Safety Policy",
                        actor_role="Rule Engine",
                        action="Severity elevated to CRITICAL",
                        outcome=safety_rule_text or "Hazard detection rule enforced",
                    )
                # 5. Task created
                self.repository.log_activity(
                    task_id=saved_task.id,
                    room_id=issue.room_id,
                    event_type="TASK_CREATED",
                    title="Task created",
                    actor_name="Maintenance Agent",
                    actor_role="AI Agent",
                    action=f"Maintenance task created · {cat_val}",
                    outcome=f"{priority_level} priority",
                )
                # 6. Staff assigned
                self.repository.log_activity(
                    task_id=saved_task.id,
                    room_id=issue.room_id,
                    event_type="STAFF_ASSIGNED",
                    title="Technician assigned",
                    actor_name="Maintenance Agent",
                    actor_role="AI Agent",
                    action=f"Assigned {technician.name}",
                    outcome=match_reason,
                )
                # 7. Escalation recorded if CRITICAL from a named safety rule or human override
                if (issue.severity == MaintenanceSeverity.CRITICAL or sev_val == "CRITICAL") and (safety_rule_applied or is_human_override):
                    self.repository.log_activity(
                        task_id=saved_task.id,
                        room_id=issue.room_id,
                        event_type="TASK_ESCALATED",
                        title="Critical escalation recorded",
                        actor_name="Maintenance Agent",
                        actor_role="AI Agent",
                        action=f"Emergency escalation recorded for {settings.DEFAULT_SUPERVISOR_NAME}",
                        outcome=f"Technician {technician.name} dispatched. Security ext. {settings.HOTEL_SECURITY_EXTENSION}.",
                    )

            self.activity_logs.append({
                "agent": "MAINTENANCE_AGENT",
                "action": "CREATE_AND_ASSIGN_INCIDENT",
                "room_id": issue.room_id,
                "incident_id": updated_incident.id,
                "operational_task_id": saved_task.id,
                "category": issue.category,
                "severity": issue.severity,
                "sla_minutes": sla_minutes,
                "assigned_technician_id": technician.id,
                "previous_status": previous_status,
                "new_status": new_room_status_enum,
                "status": "COMPLETED",
            })

            return MaintenanceResult(
                room_id=issue.room_id,
                incident_id=updated_incident.id,
                operational_task_id=saved_task.id,
                category=issue.category,
                severity=issue.severity,
                sla_minutes=sla_minutes,
                assigned_technician_id=technician.id,
                assigned_technician_name=technician.name,
                previous_room_status=previous_status,
                new_room_status=new_status_str,
                incident_status=updated_incident.status,
                result_status=MaintenanceResultStatus.MAINTENANCE_ASSIGNED,
                reason=f"Assigned to {technician.name}",
            )

        # 12. IF NO technician was found
        else:
            saved_incident.status = IncidentStatus.ESCALATED
            saved_incident.technician_match_reason = "No available technician with required skill"
            self.repository.save_maintenance_incident(saved_incident)

            self.activity_logs.append({
                "agent": "MAINTENANCE_AGENT",
                "action": "ESCALATE_NO_TECHNICIAN",
                "room_id": issue.room_id,
                "incident_id": saved_incident.id,
                "category": issue.category,
                "severity": issue.severity,
                "status": "ESCALATED",
            })

            return MaintenanceResult(
                room_id=issue.room_id,
                incident_id=saved_incident.id,
                operational_task_id=None,
                category=issue.category,
                severity=issue.severity,
                sla_minutes=sla_minutes,
                assigned_technician_id=None,
                assigned_technician_name=None,
                previous_room_status=previous_status,
                new_room_status=new_status_str,
                incident_status=IncidentStatus.ESCALATED,
                result_status=MaintenanceResultStatus.WAITING_FOR_TECHNICIAN,
                reason="No available technician with required skill; escalated",
            )
