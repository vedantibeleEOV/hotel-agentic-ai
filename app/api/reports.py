import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, status

from app.dependencies.auth import get_current_user
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_user)])
repository = PostgresHotelRepository()


@router.get(
    "/reports/summary",
    status_code=status.HTTP_200_OK,
    summary="Get Operational Reports Summary",
    description="Retrieve operational metrics, automation rates, turnaround times, SLA compliance, staff utilization, and daily trends from PostgreSQL. Strictly read-only.",
)
async def get_reports_summary_endpoint(
    range: Optional[str] = Query(default="7d", description="Time range: today, 7d, 30d")
):
    """Retrieve operational performance reports data aggregated from PostgreSQL."""
    return repository.get_reports_summary(range_param=range)
