import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from typing import Optional

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

    def _get_required_skill(self, category: MaintenanceCategory) -> MaintenanceSkill:
        skill_mapping = {
            MaintenanceCategory.HVAC: MaintenanceSkill.HVAC,
            MaintenanceCategory.ELECTRICAL: MaintenanceSkill.ELECTRICAL,
            MaintenanceCategory.PLUMBING: MaintenanceSkill.PLUMBING,
            MaintenanceCategory.FURNITURE: MaintenanceSkill.GENERAL,
            MaintenanceCategory.SAFETY: MaintenanceSkill.GENERAL,
            MaintenanceCategory.GENERAL: MaintenanceSkill.GENERAL,
        }
        return skill_mapping.get(category, MaintenanceSkill.GENERAL)

    def _select_best_technician(
        self, candidates: list[Staff], room_floor: Optional[int]
    ) -> Optional[Staff]:
        if not candidates:
            return None

        return min(
            candidates,
            key=lambda c: (
                0 if (room_floor is not None and c.assigned_floor == room_floor) else 1,
                c.active_task_count,
                c.id,
            ),
        )

    def report_issue(self, issue: MaintenanceIssueReport) -> MaintenanceResult:
        # 1. Look up room
        room = self.repository.get_room_by_id(issue.room_id)
        if not room:
            raise ValueError("Room not found")

        # 2. Look up reporting staff member
        reporting_staff = self.repository.staff.get(issue.reported_by_staff_id)
        if not reporting_staff:
            raise ValueError("Reporting staff not found")

        # 3. Check staff role
        allowed_roles = (StaffRole.HOUSEKEEPING, StaffRole.MAINTENANCE)
        if reporting_staff.role not in allowed_roles:
            raise ValueError("Only hotel staff (housekeeping or maintenance) can report maintenance issues")

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

        # 6. Update room status to MAINTENANCE only if not OCCUPIED
        if previous_status != RoomStatus.OCCUPIED.value:
            if previous_status != RoomStatus.MAINTENANCE.value:
                self.repository.update_room_status(issue.room_id, RoomStatus.MAINTENANCE)
            new_room_status_enum = RoomStatus.MAINTENANCE
        else:
            new_room_status_enum = RoomStatus.OCCUPIED

        new_status_str = new_room_status_enum.value if hasattr(new_room_status_enum, "value") else str(new_room_status_enum)

        # 7. Calculate SLA minutes
        sla_minutes = self._calculate_sla(issue.severity)

        # 8. Calculate required skill
        required_skill = self._get_required_skill(issue.category)

        # 9. Create and save MaintenanceIncident
        incident = MaintenanceIncident(
            room_id=issue.room_id,
            reported_by_staff_id=issue.reported_by_staff_id,
            description=issue.description,
            category=issue.category,
            severity=issue.severity,
            sla_minutes=sla_minutes,
        )
        saved_incident = self.repository.save_maintenance_incident(incident)

        # 10. Get candidate technicians & select best one
        candidates = self.repository.get_available_maintenance_staff(required_skill, room.floor)
        technician = self._select_best_technician(candidates, room.floor)

        # 11. IF technician was found
        if technician:
            severity_priority_map = {
                MaintenanceSeverity.CRITICAL: (100, "CRITICAL"),
                MaintenanceSeverity.HIGH: (80, "HIGH"),
                MaintenanceSeverity.MEDIUM: (50, "MEDIUM"),
                MaintenanceSeverity.LOW: (20, "NORMAL"),
            }
            priority_score, priority_level = severity_priority_map.get(issue.severity, (20, "NORMAL"))

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
            self.repository.save_maintenance_incident(updated_incident)

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
