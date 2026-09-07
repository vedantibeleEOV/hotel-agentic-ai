from fastapi import APIRouter
from app.api.v1.endpoints import health, agent, gemeni, hotel_stuff

api_router = APIRouter()

# Include health routes
api_router.include_router(health.router)

# Include agent routes
api_router.include_router(agent.router)

api_router.include_router(gemeni.router)
api_router.include_router(hotel_stuff.router)
