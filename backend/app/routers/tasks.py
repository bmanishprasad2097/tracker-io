from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter(tags=["Tasks"])


@router.post("/topics/{topic_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(topic_id: UUID, payload: TaskCreate, db: AsyncSession = Depends(get_db)) -> TaskResponse:
    task = await TaskService(db).create_task(topic_id, payload)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: UUID, payload: TaskUpdate, db: AsyncSession = Depends(get_db)) -> TaskResponse:
    task = await TaskService(db).update_task(task_id, payload)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID, db: AsyncSession = Depends(get_db)) -> Response:
    await TaskService(db).delete_task(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
