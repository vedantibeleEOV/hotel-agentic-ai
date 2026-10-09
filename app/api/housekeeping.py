from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, status

from app.dependencies.auth import get_current_user
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter(dependencies=[Depends(get_current_user)])
repository = PostgresHotelRepository()


@router.get(
    "/housekeeping/board",
    status_code=status.HTTP_200_OK,
    summary="Get Housekeeping Kanban Board",
    description="Retrieve live housekeeping operations board including workload summary, column cards, staff attendants, and real-time SLA metrics.",
)
async def get_housekeeping_board_endpoint(
    floor: Optional[int] = Query(None, description="Optional filter by hotel room floor (e.g. 1, 2, 3, 4, 5)"),
) -> Dict[str, Any]:
    """Retrieve housekeeping board data structured for the operations interface."""
    return repository.get_housekeeping_board(floor=floor)
