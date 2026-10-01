from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def check_health():
    """Health check endpoint to verify backend service readiness."""
    return HealthResponse(
        status="ok",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        details={
            "environment": "development",
            "tts_engine": "edge-tts (planned)"
        }
    )
