from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.roadmap import RoadmapCreate, RoadmapDetail, RoadmapListItem, RoadmapUpdate
from app.services.roadmap_service import RoadmapService

router = APIRouter(prefix="/roadmaps", tags=["Roadmaps"])


@router.get("", response_model=list[RoadmapListItem])
async def list_roadmaps(db: AsyncSession = Depends(get_db)) -> list[RoadmapListItem]:
    return await RoadmapService(db).list_roadmaps()


@router.post("", response_model=RoadmapListItem, status_code=status.HTTP_201_CREATED)
async def create_roadmap(payload: RoadmapCreate, db: AsyncSession = Depends(get_db)) -> RoadmapListItem:
    roadmap = await RoadmapService(db).create_roadmap(payload)
    return RoadmapListItem(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        color=roadmap.color,
        sort_order=roadmap.sort_order,
        is_archived=roadmap.is_archived,
        total_tasks=0,
        completed_tasks=0,
        in_progress_tasks=0,
        progress_percent=0.0,
        created_at=roadmap.created_at,
        updated_at=roadmap.updated_at,
    )


@router.get("/{roadmap_id}", response_model=RoadmapDetail)
async def get_roadmap_detail(roadmap_id: UUID, db: AsyncSession = Depends(get_db)) -> RoadmapDetail:
    return await RoadmapService(db).get_roadmap_detail(roadmap_id)


@router.patch("/{roadmap_id}", response_model=RoadmapListItem)
async def update_roadmap(
    roadmap_id: UUID, payload: RoadmapUpdate, db: AsyncSession = Depends(get_db)
) -> RoadmapListItem:
    roadmap = await RoadmapService(db).update_roadmap(roadmap_id, payload)
    return RoadmapListItem(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        color=roadmap.color,
        sort_order=roadmap.sort_order,
        is_archived=roadmap.is_archived,
        total_tasks=0,
        completed_tasks=0,
        in_progress_tasks=0,
        progress_percent=0.0,
        created_at=roadmap.created_at,
        updated_at=roadmap.updated_at,
    )


@router.delete("/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roadmap(roadmap_id: UUID, db: AsyncSession = Depends(get_db)) -> Response:
    await RoadmapService(db).delete_roadmap(roadmap_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
