from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.topic import TopicResponse


class RoadmapBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    color: str = Field(default="#6366f1", min_length=7, max_length=7)
    sort_order: int = 0
    is_archived: bool = False


class RoadmapCreate(RoadmapBase):
    pass


class RoadmapUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    color: str | None = Field(default=None, min_length=7, max_length=7)
    sort_order: int | None = None
    is_archived: bool | None = None


class RoadmapListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    color: str
    sort_order: int
    is_archived: bool
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    progress_percent: float
    created_at: datetime
    updated_at: datetime


class RoadmapDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    color: str
    sort_order: int
    is_archived: bool
    topics: list[TopicResponse]
    total_tasks: int
    completed_tasks: int
    progress_percent: float
    created_at: datetime
    updated_at: datetime
