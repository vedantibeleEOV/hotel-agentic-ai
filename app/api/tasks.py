from typing import Any, Dict, List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status

from app.repositories.postgres_hotel_repository import PostgresHotelRepository

router = APIRouter()
repository = PostgresHotelRepository()


@router.get(
    "/tasks/summary",
    status_code=status.HTTP_200_OK,
    summary="Get operational tasks summary metrics",
    description="Retrieve aggregated task counts including open count, assigned count, counts by type and by priority.",
)
async def get_tasks_summary_endpoint() -> Dict[str, Any]:
    """Retrieve operational tasks summary metrics from database."""
    return repository.get_tasks_summary()


@router.get(
    "/tasks/board",
    status_code=status.HTTP_200_OK,
    summary="List tasks for task board view",
    description="Retrieve rich operational tasks formatted for board view with SLA deadlines, staff, room metadata, and filtering.",
)
@router.get(
    "/tasks",
    status_code=status.HTTP_200_OK,
    summary="List all operational tasks",
    description="Retrieve operational tasks with rich metadata, SLA tracking, staff assignments, and flexible filtering.",
)
async def list_tasks_endpoint(
    type: Optional[str] = Query(None, description="Filter by task type: cleaning or maintenance"),
    status_group: Optional[str] = Query("open", description="Filter by status group: open (default), completed, all"),
    status: Optional[str] = Query(None, description="Filter tasks by exact status (e.g. ASSIGNED, COMPLETED, PENDING)"),
    priority: Optional[str] = Query(None, description="Filter tasks by priority level (e.g. URGENT, HIGH, STANDARD, NORMAL)"),
    floor: Optional[int] = Query(None, description="Filter tasks by room floor"),
    staff_id: Optional[int] = Query(None, description="Filter tasks by assigned staff ID"),
    room_id: Optional[int] = Query(None, description="Filter tasks by room ID"),
    search: Optional[str] = Query(None, description="Search term for display ID, room number, description, staff name"),
) -> List[Dict[str, Any]]:
    """List operational tasks with enriched metadata and real SQL joins."""
    return repository.get_tasks_detailed(
        task_type=type,
        status_group=status_group,
        status=status,
        priority=priority,
        floor=floor,
        staff_id=staff_id,
        room_id=room_id,
        search=search,
    )


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


@router.get(
    "/tasks/{task_id}/detail",
    status_code=status.HTTP_200_OK,
    summary="Get task detail for drawer view",
    description="Retrieve all details for the task detail drawer including room, staff, next guest, SLA, allowed actions, and activity timeline.",
)
async def get_task_detail_endpoint(task_id: UUID) -> Dict[str, Any]:
    """Retrieve enriched task detail for side drawer."""
    try:
        return repository.get_task_detail(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get(
    "/tasks/{task_id}/assignable-staff",
    status_code=status.HTTP_200_OK,
    summary="Get assignable staff for task reassignment",
    description="Retrieve staff of the matching role who are eligible for assignment with their open task counts.",
)
async def get_assignable_staff_endpoint(task_id: UUID) -> List[Dict[str, Any]]:
    """Retrieve assignable staff list for a task."""
    try:
        return repository.get_assignable_staff(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


from pydantic import BaseModel, Field


class BlockTaskRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason why the task is blocked")


class EscalateTaskRequest(BaseModel):
    note: Optional[str] = Field(None, description="Optional note for escalation")


class ReassignTaskRequest(BaseModel):
    staff_id: int = Field(..., description="ID of staff member to reassign to")


class ChangePriorityRequest(BaseModel):
    priority: str = Field(..., description="New priority: HIGH, MEDIUM, or LOW")


@router.post(
    "/tasks/{task_id}/start",
    status_code=status.HTTP_200_OK,
    summary="Start task cleaning or repair",
    description="Start an operational task, set started_at, update room status, and return the updated task detail.",
)
async def start_task_endpoint(task_id: UUID) -> Dict[str, Any]:
    """Start task execution."""
    try:
        repository.start_task(task_id)
        return repository.get_task_detail(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "already in progress" in err_msg.lower() or "cannot start" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/tasks/{task_id}/block",
    status_code=status.HTTP_200_OK,
    summary="Mark task as blocked / on hold",
    description="Mark an operational task as blocked with an optional reason, and return the updated task detail.",
)
async def block_task_endpoint(task_id: UUID, req: Optional[BlockTaskRequest] = None) -> Dict[str, Any]:
    """Block task execution."""
    reason = req.reason if req else None
    try:
        repository.block_task(task_id, reason=reason)
        return repository.get_task_detail(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "already blocked" in err_msg.lower() or "cannot block" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/tasks/{task_id}/escalate",
    status_code=status.HTTP_200_OK,
    summary="Escalate task to supervisor",
    description="Record an escalation event for the task, and return the updated task detail.",
)
async def escalate_task_endpoint(task_id: UUID, req: Optional[EscalateTaskRequest] = None) -> Dict[str, Any]:
    """Escalate task."""
    note = req.note if req else None
    try:
        repository.escalate_task(task_id, note=note)
        return repository.get_task_detail(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "cannot escalate" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/tasks/{task_id}/cancel",
    status_code=status.HTTP_200_OK,
    summary="Cancel an operational task",
    description="Cancel task, release assigned staff, revert room status if applicable, and return the updated task detail.",
)
async def cancel_task_endpoint(task_id: UUID) -> Dict[str, Any]:
    """Cancel task."""
    try:
        repository.cancel_task(task_id)
        return repository.get_task_detail(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "cannot cancel" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/tasks/{task_id}/reassign",
    status_code=status.HTTP_200_OK,
    summary="Reassign task to another staff member",
    description="Reassign operational task to an eligible staff member, update workloads in one transaction, and return updated task detail.",
)
async def reassign_task_endpoint(task_id: UUID, req: ReassignTaskRequest) -> Dict[str, Any]:
    """Reassign task to staff."""
    try:
        repository.reassign_task(task_id, req.staff_id)
        return repository.get_task_detail(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "cannot reassign" in err_msg.lower() or "requires" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.patch(
    "/tasks/{task_id}/priority",
    status_code=status.HTTP_200_OK,
    summary="Change task priority as human override",
    description="Update priority level and score, record human override in activity log, and return updated task detail.",
)
async def change_task_priority_endpoint(task_id: UUID, req: ChangePriorityRequest) -> Dict[str, Any]:
    """Update task priority."""
    try:
        repository.change_task_priority(task_id, req.priority)
        return repository.get_task_detail(task_id)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "cannot change priority" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        if "invalid priority" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.post(
    "/tasks/{task_id}/complete",
    status_code=status.HTTP_200_OK,
    summary="Complete a task and release staff",
    description="Mark an operational task as completed, release assigned staff, and transition room status accordingly.",
    responses={
        200: {
            "description": "Task completed successfully and staff released.",
        },
        404: {
            "description": "Not Found - Task not found",
        },
        409: {
            "description": "Conflict - Task is already completed or cancelled",
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
        if "already completed" in err_msg.lower() or "cannot complete" in err_msg.lower():
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
