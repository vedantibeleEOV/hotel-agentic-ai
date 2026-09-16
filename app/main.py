import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.checkout import housekeeping_agent, repository, router as checkout_router
from app.api.maintenance import maintenance_agent, router as maintenance_router
from app.api.tasks import router as tasks_router
from app.api.v1.router import api_router
from app.config import settings
from app.database.connection import engine

# Configure standard logging to display INFO and WARNING logs in terminal console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# Suppress Uvicorn default INFO logs for clean custom startup output
for uvicorn_logger in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    logging.getLogger(uvicorn_logger).setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Step a: Load Environment Configuration
    if settings.PROJECT_NAME and settings.VERSION and settings.sync_database_url:
        print("Loading environment configuration... OK", flush=True)
    else:
        print("Loading environment configuration... FAILED", flush=True)
        raise RuntimeError("Missing required environment settings")

    # Step b: Connect to PostgreSQL database
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"Connecting to PostgreSQL database... OK (connected to {settings.POSTGRES_DB})", flush=True)
    except Exception as e:
        print(f"Connecting to PostgreSQL database... FAILED: {e}", flush=True)
        raise e

    # Step c: Initializing repository and agents
    if repository and housekeeping_agent and maintenance_agent:
        print("Initializing repository and agents... OK", flush=True)
    else:
        print("Initializing repository and agents... FAILED", flush=True)
        raise RuntimeError("Failed to initialize repositories or agents")

    # Step d: Registering API routers
    print("Registering API routers... OK (mounted: /api/v1, /api/events/checkout, /api/events/maintenance-issue, /api/tasks)", flush=True)

    # Step e: Application ready
    print(f"Application ready to accept requests on http://{settings.HOST}:{settings.PORT}", flush=True)

    yield

    # Shutdown Phase
    print("Shutting down application...", flush=True)
    engine.dispose()



app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous Multi-Agent System for Hotel Operations",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular API v1 routes
app.include_router(api_router)

# Mount Checkout Events router
app.include_router(
    checkout_router,
    prefix="/api",
    tags=["Checkout Events"]
)

# Mount Maintenance Events router
app.include_router(
    maintenance_router,
    prefix="/api",
    tags=["Maintenance Events"]
)

# Mount Tasks router
app.include_router(
    tasks_router,
    prefix="/api",
    tags=["Tasks"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG, log_level="warning")
