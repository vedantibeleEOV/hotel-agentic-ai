from fastapi import APIRouter, HTTPException, status

from app.agents.maintenance_agent import MaintenanceAgent
from app.agents.orchestrator_agent import OperationsOrchestratorAgent
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter()
repository = PostgresHotelRepository()
orchestrator = OperationsOrchestratorAgent(repository)
maintenance_agent = MaintenanceAgent(repository)


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
