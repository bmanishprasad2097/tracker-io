from datetime import date, timedelta

from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import Date

from app.models import Roadmap, Task, Topic
from app.schemas.dashboard import DashboardStatsResponse, TasksCompletedPerDay


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_stats(self) -> DashboardStatsResponse:
        total_roadmaps = int((await self.db.scalar(select(func.count(Roadmap.id)))) or 0)
        total_topics = int((await self.db.scalar(select(func.count(Topic.id)))) or 0)
        total_tasks = int((await self.db.scalar(select(func.count(Task.id)))) or 0)
        completed_tasks = int(
            (await self.db.scalar(select(func.count(Task.id)).where(Task.status == "completed"))) or 0
        )
        completion_percent = (completed_tasks * 100.0 / total_tasks) if total_tasks else 0.0

        today = date.today()
        start_date = today - timedelta(days=29)
        completed_date_expr = cast(Task.completed_at, Date)
        completed_rows = (
            await self.db.execute(
                select(
                    completed_date_expr.label("completed_date"),
                    func.count(Task.id).label("count"),
                )
                .where(
                    Task.completed_at.is_not(None),
                    completed_date_expr >= start_date,
                )
                .group_by(completed_date_expr)
                .order_by(completed_date_expr.asc())
            )
        ).all()

        count_by_date = {row.completed_date: int(row.count) for row in completed_rows}
        tasks_completed_per_day = [
            TasksCompletedPerDay(date=current, count=count_by_date.get(current, 0))
            for current in (start_date + timedelta(days=offset) for offset in range(30))
        ]

        completion_dates = set(
            (
                await self.db.scalars(
                    select(completed_date_expr.label("completed_date"))
                    .where(Task.completed_at.is_not(None))
                    .group_by(completed_date_expr)
                )
            ).all()
        )

        current_streak = self._calculate_streak(completion_dates, today)
        return DashboardStatsResponse(
            total_roadmaps=total_roadmaps,
            total_topics=total_topics,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            completion_percent=completion_percent,
            current_streak=current_streak,
            tasks_completed_per_day=tasks_completed_per_day,
        )

    @staticmethod
    def _calculate_streak(completion_dates: set[date], today: date) -> int:
        if today not in completion_dates:
            return 0

        streak = 0
        current = today
        while current in completion_dates:
            streak += 1
            current -= timedelta(days=1)
        return streak
