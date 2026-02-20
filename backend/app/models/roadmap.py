from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.topic import Topic


class Roadmap(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roadmaps"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6366f1")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_archived: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    topics: Mapped[list["Topic"]] = relationship(
        back_populates="roadmap",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Topic.sort_order",
    )
