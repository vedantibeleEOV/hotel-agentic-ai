from typing import Any, Dict, Optional, Union
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.agents.maintenance_agent import MaintenanceAgent
from app.agents.orchestrator_agent import OperationsOrchestratorAgent
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
) -> Dict[str, Any]:
    """Retrieve structured maintenance board payload from PostgreSQL."""
    return repository.get_maintenance_board(tab=tab, floor=floor, search=search)


@router.get(
    "/maintenance/{id}/detail",
    status_code=status.HTTP_200_OK,
    summary="Get Maintenance Issue Detail",
    description="Retrieve full maintenance issue detail drawer payload by incident UUID or operational task UUID.",
)
async def get_maintenance_detail_endpoint(id: UUID) -> Dict[str, Any]:
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
    description="Update category and/or severity, recalculate SLA and task priority, record audit trail event, and return updated detail.",
)
async def override_classification_endpoint(
    id: UUID, req: OverrideClassificationRequest
) -> Dict[str, Any]:
    """Override AI classification for maintenance issue."""
    try:
        return repository.override_maintenance_classification(
            identifier=id,
            category=req.category,
            severity=req.severity,
            reason=req.reason,
            staff_id=req.staff_id,
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
    id: UUID, req: Optional[ResolveMaintenanceRequest] = None
) -> Dict[str, Any]:
    """Resolve maintenance issue and update room readiness."""
    staff_id = req.staff_id if req else None
    notes = req.notes if req else None
    try:
        return repository.resolve_maintenance_incident(
            identifier=id,
            staff_id=staff_id,
            notes=notes,
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
    responses={
        202: {
            "description": "Maintenance issue reported and routed successfully.",
        },
        400: {
            "description": "Bad Request - Invalid room, staff, or issue details",
        },
        409: {
            "description": "Conflict - Room status does not allow reporting a maintenance issue",
        },
    },
)
async def process_maintenance_issue(issue: MaintenanceIssueReport):
    # Pre-check: Verify reporting staff exists before executing agents
    reporting_staff = repository.get_staff_by_id(issue.reported_by_staff_id)
    if not reporting_staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reporting staff not found",
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

