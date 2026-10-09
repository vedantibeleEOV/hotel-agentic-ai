import logging
from fastapi import APIRouter, Depends, status

from app.dependencies.auth import get_current_user
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_user)])
repository = PostgresHotelRepository()


@router.get(
    "/dashboard/summary",
    status_code=status.HTTP_200_OK,
    summary="Get Dashboard Summary",
    description="Retrieve live dashboard metrics including property info, KPI cards, needs attention list, autonomy statistics, live operations lanes, floor map, and recent activities. Strictly read-only.",
)
async def get_dashboard_summary_endpoint():
    """Retrieve live dashboard command center summary."""
    return repository.get_dashboard_summary()
