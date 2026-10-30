from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class MigrationCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    cluster_id: UUID
    namespace: str
    application_name: str
    production_url: str
    target_controller: str = "TRAEFIK"

class MigrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    migration_number: Optional[int] = None
    name: str
    cluster_id: UUID
    source_controller: str
    target_controller: str
    current_state: str
    temporal_workflow_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

class MigrationDetailResponse(MigrationResponse):
    cluster_name: Optional[str] = None
    application_name: Optional[str] = None
    production_url: Optional[str] = None
    active_version_number: Optional[int] = 1
    has_verified_backup: bool = False
    developer_approved: bool = False
    production_approved: bool = False
    runtime_url: Optional[str] = None
    timeline_events: List[Dict[str, Any]] = Field(default_factory=list)
