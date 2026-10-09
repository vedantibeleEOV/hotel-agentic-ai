from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.dependencies.auth import get_current_user
from app.models.staff import Staff
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter(dependencies=[Depends(get_current_user)])
repository = PostgresHotelRepository()


@router.get(
    "/staff",
    status_code=status.HTTP_200_OK,
    summary="Get Hotel Staff Members",
    description="Retrieve all staff members with optional role filter (HOUSEKEEPING, MAINTENANCE, FRONT_DESK, SUPERVISOR).",
)
async def get_staff_endpoint(
    role: Optional[str] = Query(None, description="Filter staff by role"),
) -> List[Staff]:
    """Retrieve list of staff members from database."""
    return repository.get_all_staff(role=role)
