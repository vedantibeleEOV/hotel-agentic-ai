from typing import Any, Dict, Optional, Union
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.agents.maintenance_agent import MaintenanceAgent
from app.agents.orchestrator_agent import OperationsOrchestratorAgent
from app.database.connection import SessionLocal
from app.database.orm.operational_task_entity import OperationalTaskEntity
from app.dependencies.auth import get_current_user, require_role
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter()
repository = PostgresHotelRepository()
orchestrator = OperationsOrchestratorAgent(repository)
maintenance_agent = MaintenanceAgent(repository)


class OverrideClassificationRequest(BaseModel):
    category: Optional[str] = Field(None, description="New category: HVAC, PLUMBING, ELECTRICAL, FURNITURE, SAFETY, GENERAL")
    severity: Optional[str] = Field(None, description="New severity: CRITICAL, HIGH, MEDIUM, LOW")
    reason: str = Field(..., description="Explanation for human override")
    staff_id: Optional[int] = Field(None, description="Staff ID performing the override")


class ResolveMaintenanceRequest(BaseModel):
    staff_id: Optional[int] = Field(None, description="Staff ID resolving the issue")
    notes: Optional[str] = Field(None, description="Resolution notes")


@router.get(
    "/maintenance/board",
    status_code=status.HTTP_200_OK,
    summary="Get Maintenance Board",
    description="Retrieve maintenance dashboard with 7 summary KPIs, tab counts, issues sorted by severity/SLA, technician availability, and dynamic skill warnings.",
)
async def get_maintenance_board_endpoint(
    tab: Optional[str] = Query("open", description="Filter tab: open, critical, unassigned, completed"),
    floor: Optional[Union[int, str]] = Query(None, description="Filter by room floor"),
    search: Optional[str] = Query(None, description="Search term for display ID, room, description, staff"),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve structured maintenance board payload from PostgreSQL."""
    return repository.get_maintenance_board(tab=tab, floor=floor, search=search)


@router.get(
    "/maintenance/{id}/detail",
    status_code=status.HTTP_200_OK,
    summary="Get Maintenance Issue Detail",
    description="Retrieve full maintenance issue detail drawer payload by incident UUID or operational task UUID.",
)
async def get_maintenance_detail_endpoint(
    id: UUID,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve enriched maintenance detail for side drawer."""
    try:
        return repository.get_maintenance_detail(id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/maintenance/{id}/override-classification",
    status_code=status.HTTP_200_OK,
    summary="Override AI classification for maintenance issue",
    description="Update category and/or severity, recalculate SLA and task priority, record audit trail event, and return updated detail. Requires MANAGER or SUPERVISOR role.",
)
async def override_classification_endpoint(
    id: UUID,
    req: OverrideClassificationRequest,
    current_user: dict = Depends(require_role("MANAGER", "SUPERVISOR")),
) -> Dict[str, Any]:
    """Override AI classification for maintenance issue."""
    staff_id_override = req.staff_id or current_user.get("staff_id")
    actor_name = current_user.get("full_name") or current_user.get("username") or "Amit Shah"
    actor_role = (current_user.get("role") or "MANAGER").upper()

    try:
        return repository.override_maintenance_classification(
            identifier=id,
            category=req.category,
            severity=req.severity,
            reason=req.reason,
            staff_id=staff_id_override,
            actor_name=actor_name,
            actor_role=actor_role,
        )
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/maintenance/{id}/resolve",
    status_code=status.HTTP_200_OK,
    summary="Resolve maintenance issue",
    description="Mark incident as resolved, complete task, free technician, update room readiness, and return updated detail.",
)
async def resolve_maintenance_endpoint(
    id: UUID,
    req: Optional[ResolveMaintenanceRequest] = None,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Resolve maintenance issue and update room readiness."""
    user_role = (current_user.get("role") or "").upper()
    user_staff_id = current_user.get("staff_id")

    # Permission check
    if user_role not in ("MANAGER", "SUPERVISOR", "MAINTENANCE"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to resolve maintenance incidents.",
        )

    # If role is MAINTENANCE, ensure the technician is assigned to this incident
    if user_role == "MAINTENANCE":
        incident = repository.get_maintenance_incident_by_id(id)
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance incident not found")
        if incident.assigned_technician_id != user_staff_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only resolve maintenance incidents assigned to you.",
            )

    staff_id = req.staff_id if (req and req.staff_id) else user_staff_id
    notes = req.notes if req else None
    actor_name = current_user.get("full_name") or current_user.get("username") or "Amit Shah"
    actor_role = (current_user.get("role") or "MANAGER").upper()

    try:
        return repository.resolve_maintenance_incident(
            identifier=id,
            staff_id=staff_id,
            notes=notes,
            actor_name=actor_name,
            actor_role=actor_role,
        )
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "already resolved" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/events/maintenance-issue",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Report Maintenance Issue",
    description="Report maintenance issue and trigger agent triage. Reporter comes from authentication token.",
    responses={
        202: {"description": "Maintenance issue reported and routed successfully."},
        400: {"description": "Bad Request - Invalid room, staff, or issue details"},
        403: {"description": "Forbidden - Housekeeping attendant not assigned to this room"},
        409: {"description": "Conflict - Room status does not allow reporting a maintenance issue"},
    },
)
async def process_maintenance_issue(
    issue: MaintenanceIssueReport,
    current_user: dict = Depends(get_current_user),
):
    user_role = (current_user.get("role") or "").upper()
    user_staff_id = current_user.get("staff_id")

    # Set reporter identity directly from token (ignore any client-provided staff_id)
    issue.reported_by_staff_id = user_staff_id
    issue.reporter_name = current_user.get("full_name") or current_user.get("username") or "Amit Shah"
    issue.reporter_role = user_role or "MANAGER"

    # Housekeeping room rule check
    if user_role == "HOUSEKEEPING":
        if not user_staff_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Housekeeping user must be linked to a valid staff ID.",
            )
        with SessionLocal() as session:
            stmt = select(OperationalTaskEntity).where(
                OperationalTaskEntity.room_id == issue.room_id,
                OperationalTaskEntity.assigned_staff_id == user_staff_id,
                OperationalTaskEntity.status.in_(["PENDING", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"]),
            )
            open_task = session.execute(stmt).scalar_one_or_none()
            if not open_task:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Housekeeping attendants may only report maintenance issues for rooms currently assigned to them for cleaning.",
                )

    if issue.severity is not None:
        issue.is_human_override = True

    try:
        orchestration_result = orchestrator.process_maintenance_report(issue)
        result = maintenance_agent.report_issue(issue)
    except ValueError as e:
        err_msg = str(e)
        if "does not allow" in err_msg or "Room status" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )

    return {
        "message": "Maintenance issue reported and routed",
        "processing_status": "ROUTED",
        "orchestration": orchestration_result,
        "maintenance": result,
    }
