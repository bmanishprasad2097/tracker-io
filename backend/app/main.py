from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.config import get_settings
from app.database import check_db_connection
from app.middleware.auth import verify_api_key
from app.routers import dashboard_router, roadmaps_router, tasks_router, topics_router

settings = get_settings()

app = FastAPI(title=settings.app_name, default_response_class=ORJSONResponse)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roadmaps_router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(topics_router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(tasks_router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(dashboard_router, prefix="/api", dependencies=[Depends(verify_api_key)])


@app.get("/health")
async def health() -> dict[str, str]:
    connected = await check_db_connection()
    if not connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        )
    return {"status": "ok", "db": "connected"}
