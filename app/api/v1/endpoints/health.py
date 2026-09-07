import logging
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
    }


@router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "debug": settings.DEBUG}


@router.get("/health/db", tags=["Health"], summary="Database Health Check")
@router.get("/db", tags=["Health"], summary="Database Health Check Alias")
async def db_health_check(db: Session = Depends(get_db)):
    """Check PostgreSQL database connection health via SELECT 1 query."""
    try:
        result = db.execute(text("SELECT 1")).scalar()
        if result == 1:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "healthy",
                    "database": "connected",
                },
            )
        else:
            raise Exception("Unexpected query result")
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "detail": "Database connection failed",
            },
        )
