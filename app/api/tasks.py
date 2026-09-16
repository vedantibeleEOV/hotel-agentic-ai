from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status

from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter()
repository = PostgresHotelRepository()


@router.get(
    "/tasks",
    status_code=status.HTTP_200_OK,
    summary="List all operational tasks",
    description="Retrieve all housekeeping and maintenance tasks with optional status and room filtering.",
)
async def list_tasks_endpoint(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter tasks by status (e.g. ASSIGNED, COMPLETED, PENDING)"),
    room_id: Optional[int] = Query(None, description="Filter tasks by room ID"),
):
    """List operational tasks from database."""
    all_tasks = list(repository.operational_tasks.values())
    if status_filter:
        all_tasks = [t for t in all_tasks if t.status.value.upper() == status_filter.upper()]
    if room_id:
        all_tasks = [t for t in all_tasks if t.room_id == room_id]
    return all_tasks


@router.get(
    "/tasks/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Get operational task by ID",
    description="Retrieve details of a single task including assigned staff and room.",
)
async def get_task_endpoint(task_id: UUID):
    """Retrieve an operational task by ID."""
    task = repository.get_operational_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found.",
        )
    room = repository.get_room_by_id(task.room_id)
    assigned_staff = (
        repository.get_staff_by_id(task.assigned_staff_id)
        if task.assigned_staff_id
        else None
    )
    return {
        "task": task,
        "room": room,
        "assigned_staff": assigned_staff,
    }


@router.post(
    "/tasks/{task_id}/complete",
    status_code=status.HTTP_200_OK,
    summary="Complete a task and release staff",
    description="Mark an operational task as completed, release assigned staff, and transition room to READY.",
    responses={
        200: {
            "description": "Task completed successfully and staff released.",
        },
        404: {
            "description": "Not Found - Task not found",
        },
        409: {
            "description": "Conflict - Task is already completed",
        },
    },
)
async def complete_task_endpoint(task_id: UUID):
    """Mark an operational task as completed and release assigned staff."""
    try:
        updated_task = repository.complete_task(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg,
            )
        if "already completed" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )

    room = repository.get_room_by_id(updated_task.room_id)
    assigned_staff = (
        repository.get_staff_by_id(updated_task.assigned_staff_id)
        if updated_task.assigned_staff_id
        else None
    )

    return {
        "message": "Task completed successfully",
        "task": updated_task,
        "room": room,
        "assigned_staff": assigned_staff,
    }

