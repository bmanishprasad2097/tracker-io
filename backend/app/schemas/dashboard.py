from datetime import date

from pydantic import BaseModel


class TasksCompletedPerDay(BaseModel):
    date: date
    count: int


class DashboardStatsResponse(BaseModel):
    total_roadmaps: int
    total_topics: int
    total_tasks: int
    completed_tasks: int
    completion_percent: float
    current_streak: int
    tasks_completed_per_day: list[TasksCompletedPerDay]
