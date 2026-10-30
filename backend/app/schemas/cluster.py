from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class ClusterCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    cloud_provider: str = Field("AWS", max_length=50)
    environment: str = Field(..., max_length=50)
    api_endpoint: str = Field(..., max_length=512)
    auth_method: str = Field("AWS_IAM_ROLE", max_length=50)
    role_arn: Optional[str] = None

class ClusterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    cloud_provider: str
    environment: str
    api_endpoint: str
    kubernetes_version: Optional[str] = None
    status: str
    created_at: datetime

class ClusterTestConnectionResponse(BaseModel):
    is_connected: bool
    kubernetes_version: Optional[str] = None
    namespaces_count: int = 0
    can_manage_ingress: bool = True
    can_manage_traefik_crds: bool = True
    message: str
