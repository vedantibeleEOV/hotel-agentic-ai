from fastapi import APIRouter, HTTPException, status

from app.agents.maintenance_agent import MaintenanceAgent
from app.models.maintenance_issue_report import MaintenanceIssueReport
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter()
repository = PostgresHotelRepository()
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
        "maintenance": result,
    }
