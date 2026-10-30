from fastapi import APIRouter
from app.api.v1.endpoints import clusters, events, migrations

api_router = APIRouter()

api_router.include_router(clusters.router, prefix="/clusters", tags=["Clusters"])
api_router.include_router(migrations.router, prefix="/migrations", tags=["Migrations"])
api_router.include_router(events.router, prefix="", tags=["Events, Audit & Integrations"])
