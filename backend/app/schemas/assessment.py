from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class FindingResponse(BaseModel):
    id: Optional[UUID] = None
    severity: str  # 'INFO', 'WARNING', 'BLOCKER'
    annotation_or_feature: str
    source_value: Optional[str] = None
    target_mapping: Optional[str] = None
    remediation_suggestion: str
    is_resolved: bool = False

class AssessmentRequest(BaseModel):
    target_controller: str = "TRAEFIK"
    force_reassess: bool = False

class AssessmentResponse(BaseModel):
    assessment_id: UUID
    migration_id: UUID
    target_controller: str
    is_compatible: bool
    blocker_count: int
    warning_count: int
    findings: List[FindingResponse]
    canonical_ir: Optional[Dict[str, Any]] = None
    assessed_at: datetime

class DiffResponse(BaseModel):
    migration_id: UUID
    version_number: int
    source_nginx_yaml: str
    target_traefik_yaml: str
    changed_directives_summary: List[str]
