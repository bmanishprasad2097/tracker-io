from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Roadmap, Task, Topic
from app.schemas.roadmap import RoadmapCreate, RoadmapDetail, RoadmapListItem, RoadmapUpdate
from app.schemas.topic import TopicResponse


class RoadmapService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_roadmaps(self) -> list[RoadmapListItem]:
        total_tasks = func.count(Task.id).label("total_tasks")
        completed_tasks = func.sum(case((Task.status == "completed", 1), else_=0)).label(
            "completed_tasks"
        )
        in_progress_tasks = func.sum(case((Task.status == "in_progress", 1), else_=0)).label(
            "in_progress_tasks"
        )
        progress_percent = case(
            (func.count(Task.id) == 0, 0.0),
            else_=(func.sum(case((Task.status == "completed", 1), else_=0)) * 100.0)
            / func.count(Task.id),
        ).label("progress_percent")

        query = (
            select(
                Roadmap.id,
                Roadmap.title,
                Roadmap.description,
                Roadmap.color,
                Roadmap.sort_order,
                Roadmap.is_archived,
                Roadmap.created_at,
                Roadmap.updated_at,
                total_tasks,
                completed_tasks,
                in_progress_tasks,
                progress_percent,
            )
            .outerjoin(Topic, Topic.roadmap_id == Roadmap.id)
            .outerjoin(Task, Task.topic_id == Topic.id)
            .group_by(Roadmap.id)
            .order_by(Roadmap.sort_order.asc(), Roadmap.created_at.asc())
        )
        rows = (await self.db.execute(query)).all()

        result: list[RoadmapListItem] = []
        for row in rows:
            result.append(
                RoadmapListItem(
                    id=row.id,
                    title=row.title,
                    description=row.description,
                    color=row.color,
                    sort_order=row.sort_order,
                    is_archived=row.is_archived,
                    total_tasks=int(row.total_tasks or 0),
                    completed_tasks=int(row.completed_tasks or 0),
                    in_progress_tasks=int(row.in_progress_tasks or 0),
                    progress_percent=float(row.progress_percent or 0.0),
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
            )
        return result

    async def get_roadmap_detail(self, roadmap_id: UUID) -> RoadmapDetail:
        query = (
            select(Roadmap)
            .where(Roadmap.id == roadmap_id)
            .options(selectinload(Roadmap.topics).selectinload(Topic.tasks))
        )
        roadmap = (await self.db.execute(query)).scalar_one_or_none()
        if roadmap is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")

        topics: list[TopicResponse] = []
        total_tasks = 0
        completed_tasks = 0

        for topic in roadmap.topics:
            topic_total = len(topic.tasks)
            topic_completed = sum(1 for task in topic.tasks if task.status == "completed")
            topic_progress = (topic_completed * 100.0 / topic_total) if topic_total else 0.0

            topics.append(
                TopicResponse(
                    id=topic.id,
                    roadmap_id=topic.roadmap_id,
                    title=topic.title,
                    description=topic.description,
                    sort_order=topic.sort_order,
                    tasks=topic.tasks,
                    total_tasks=topic_total,
                    completed_tasks=topic_completed,
                    progress_percent=topic_progress,
                    created_at=topic.created_at,
                    updated_at=topic.updated_at,
                )
            )
            total_tasks += topic_total
            completed_tasks += topic_completed

        progress_percent = (completed_tasks * 100.0 / total_tasks) if total_tasks else 0.0
        return RoadmapDetail(
            id=roadmap.id,
            title=roadmap.title,
            description=roadmap.description,
            color=roadmap.color,
            sort_order=roadmap.sort_order,
            is_archived=roadmap.is_archived,
            topics=topics,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            progress_percent=progress_percent,
            created_at=roadmap.created_at,
            updated_at=roadmap.updated_at,
        )

    async def create_roadmap(self, payload: RoadmapCreate) -> Roadmap:
        roadmap = Roadmap(**payload.model_dump())
        self.db.add(roadmap)
        await self.db.commit()
        await self.db.refresh(roadmap)
        return roadmap

    async def update_roadmap(self, roadmap_id: UUID, payload: RoadmapUpdate) -> Roadmap:
        roadmap = await self.db.get(Roadmap, roadmap_id)
        if roadmap is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(roadmap, field, value)

        await self.db.commit()
        await self.db.refresh(roadmap)
        return roadmap

    async def delete_roadmap(self, roadmap_id: UUID) -> None:
        roadmap = await self.db.get(Roadmap, roadmap_id)
        if roadmap is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")
        await self.db.delete(roadmap)
        await self.db.commit()
