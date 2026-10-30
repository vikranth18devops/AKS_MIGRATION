from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class DeveloperApprovalRequest(BaseModel):
    status: str = Field("APPROVED", description="APPROVED or REJECTED")
    comments: str = Field(..., min_length=5)
    evidence_artifact_ids: Optional[list[UUID]] = None

class CutoverRequestCreate(BaseModel):
    strategy: str = "ALB_TARGET_GROUP_INSTANT"
    connection_draining_seconds: int = 300
    stabilization_window_seconds: int = 600
    change_ticket_ref: Optional[str] = None
    comments: Optional[str] = None

class CutoverApprovalRequest(BaseModel):
    status: str = Field("APPROVED", description="APPROVED or REJECTED")
    comments: str = Field(..., min_length=5)
    change_ticket_ref: Optional[str] = None

class CutoverExecuteRequest(BaseModel):
    connection_draining_seconds: int = 300
    stabilization_window_seconds: int = 600

class RollbackRequest(BaseModel):
    reason: str = Field(..., min_length=5)
    force_immediate: bool = True

class CutoverStatusResponse(BaseModel):
    migration_id: UUID
    state: str
    target_controller: str
    active_target_group: str
    stabilization_ends_at: Optional[datetime] = None
    http_2xx: int = 0
    http_5xx: int = 0
    error_rate_percent: float = 0.0
    latency_p95_ms: float = 0.0
    rollback_ready: bool = True
