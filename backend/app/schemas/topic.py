from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.task import TaskResponse


class TopicBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    sort_order: int | None = None


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    roadmap_id: UUID
    title: str
    description: str | None
    sort_order: int
    tasks: list[TaskResponse] = Field(default_factory=list)
    total_tasks: int = 0
    completed_tasks: int = 0
    progress_percent: float = 0.0
    created_at: datetime
    updated_at: datetime
