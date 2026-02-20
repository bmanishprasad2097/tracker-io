from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Task, Topic
from app.schemas.task import TaskCreate, TaskStatus, TaskUpdate


class TaskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_task(self, topic_id: UUID, payload: TaskCreate) -> Task:
        topic_exists = await self.db.scalar(select(Topic.id).where(Topic.id == topic_id))
        if topic_exists is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

        next_sort = (
            await self.db.scalar(select(func.max(Task.sort_order)).where(Task.topic_id == topic_id))
        ) or -1
        task = Task(topic_id=topic_id, sort_order=next_sort + 1, **payload.model_dump())
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update_task(self, task_id: UUID, payload: TaskUpdate) -> Task:
        task = await self.db.get(Task, task_id)
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        update_data = payload.model_dump(exclude_unset=True)
        if "status" in update_data:
            new_status = update_data["status"]
            if new_status == TaskStatus.COMPLETED:
                update_data["completed_at"] = datetime.now(UTC)
            else:
                update_data["completed_at"] = None

        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete_task(self, task_id: UUID) -> None:
        task = await self.db.get(Task, task_id)
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        await self.db.delete(task)
        await self.db.commit()
