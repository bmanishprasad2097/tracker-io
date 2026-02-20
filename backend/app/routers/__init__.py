from app.routers.dashboard import router as dashboard_router
from app.routers.roadmaps import router as roadmaps_router
from app.routers.tasks import router as tasks_router
from app.routers.topics import router as topics_router

__all__ = ["roadmaps_router", "topics_router", "tasks_router", "dashboard_router"]
