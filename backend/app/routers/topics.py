from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.topic import TopicCreate, TopicResponse, TopicUpdate
from app.services.topic_service import TopicService

router = APIRouter(tags=["Topics"])


@router.post("/roadmaps/{roadmap_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    roadmap_id: UUID, payload: TopicCreate, db: AsyncSession = Depends(get_db)
) -> TopicResponse:
    topic = await TopicService(db).create_topic(roadmap_id, payload)
    return TopicResponse(
        id=topic.id,
        roadmap_id=topic.roadmap_id,
        title=topic.title,
        description=topic.description,
        sort_order=topic.sort_order,
        tasks=[],
        total_tasks=0,
        completed_tasks=0,
        progress_percent=0.0,
        created_at=topic.created_at,
        updated_at=topic.updated_at,
    )


@router.patch("/topics/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: UUID, payload: TopicUpdate, db: AsyncSession = Depends(get_db)
) -> TopicResponse:
    topic = await TopicService(db).update_topic(topic_id, payload)
    return TopicResponse(
        id=topic.id,
        roadmap_id=topic.roadmap_id,
        title=topic.title,
        description=topic.description,
        sort_order=topic.sort_order,
        tasks=[],
        total_tasks=0,
        completed_tasks=0,
        progress_percent=0.0,
        created_at=topic.created_at,
        updated_at=topic.updated_at,
    )


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(topic_id: UUID, db: AsyncSession = Depends(get_db)) -> Response:
    await TopicService(db).delete_topic(topic_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
