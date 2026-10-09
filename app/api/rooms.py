from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import get_current_user
from app.models.room import Room
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter(dependencies=[Depends(get_current_user)])
repository = PostgresHotelRepository()


@router.get(
    "/rooms",
    response_model=List[Room],
    status_code=status.HTTP_200_OK,
    summary="List all rooms",
    description="Retrieve rooms with optional floor, status, and room_type filters, sorted by room_number.",
)
async def list_rooms_endpoint(
    floor: Optional[int] = Query(None, description="Filter rooms by floor number"),
    status: Optional[str] = Query(None, description="Filter rooms by status (e.g. OCCUPIED, READY, DIRTY)"),
    room_type: Optional[str] = Query(None, description="Filter rooms by room type (e.g. DELUXE, STANDARD)"),
):
    """List rooms with optional filtering, sorted by room_number."""
    return repository.get_rooms(floor=floor, status=status, room_type=room_type)


@router.get(
    "/rooms/summary",
    status_code=status.HTTP_200_OK,
    summary="Get rooms summary",
    description="Retrieve aggregated total rooms, counts by status, and counts by floor using SQL aggregation.",
)
async def get_rooms_summary_endpoint():
    """Retrieve rooms summary metrics from database."""
    return repository.get_rooms_summary()


@router.get(
    "/rooms/{room_id}",
    response_model=Room,
    status_code=status.HTTP_200_OK,
    summary="Get room by ID",
    description="Retrieve details of a single room including its current operational status.",
)
async def get_room_endpoint(room_id: int):
    """Retrieve a single room by ID."""
    room = repository.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with ID {room_id} not found.",
        )
    return room
