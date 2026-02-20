from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Roadmap, Topic
from app.schemas.topic import TopicCreate, TopicUpdate


class TopicService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_topic(self, roadmap_id: UUID, payload: TopicCreate) -> Topic:
        roadmap_exists = await self.db.scalar(select(Roadmap.id).where(Roadmap.id == roadmap_id))
        if roadmap_exists is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")

        next_sort = (
            await self.db.scalar(select(func.max(Topic.sort_order)).where(Topic.roadmap_id == roadmap_id))
        ) or -1
        topic = Topic(roadmap_id=roadmap_id, sort_order=next_sort + 1, **payload.model_dump())
        self.db.add(topic)
        await self.db.commit()
        await self.db.refresh(topic)
        return topic

    async def update_topic(self, topic_id: UUID, payload: TopicUpdate) -> Topic:
        topic = await self.db.get(Topic, topic_id)
        if topic is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(topic, field, value)
        await self.db.commit()
        await self.db.refresh(topic)
        return topic

    async def delete_topic(self, topic_id: UUID) -> None:
        topic = await self.db.get(Topic, topic_id)
        if topic is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
        await self.db.delete(topic)
        await self.db.commit()
