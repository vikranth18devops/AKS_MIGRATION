from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class ClusterCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    cloud_provider: str = Field("AWS", max_length=50)
    environment: str = Field(..., max_length=50)
    api_endpoint: str = Field(..., max_length=512)
    auth_method: str = Field("AWS_IAM_ROLE", max_length=50)
    role_arn: Optional[str] = None

class ClusterUpdate(BaseModel):
    name: Optional[str] = None
    cloud_provider: Optional[str] = None
    environment: Optional[str] = None
    api_endpoint: Optional[str] = None
    kubernetes_version: Optional[str] = None
    status: Optional[str] = None
    auth_method: Optional[str] = None
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
    is_authenticated: bool = False
    auth_method: Optional[str] = None
    created_at: datetime
    nodes_count: Optional[int] = 12
    node_type: Optional[str] = None
    workloads_count: Optional[int] = 48
    workloads: Optional[Dict[str, Any]] = None
    namespaces_count: Optional[int] = 8
    namespaces_list: Optional[List[str]] = None
    nodes_list: Optional[List[Dict[str, Any]]] = None
    pods_list: Optional[List[Dict[str, Any]]] = None
    components_in_use: Optional[Dict[str, Any]] = None
    migration_status: Optional[Dict[str, Any]] = None

class ClusterAuthRequest(BaseModel):
    auth_method: str = Field("AWS_IAM_ROLE", description="AWS_IAM_ROLE, SERVICE_ACCOUNT_TOKEN, or KUBECONFIG_OIDC")
    role_arn: Optional[str] = None
    token: Optional[str] = None
    kubeconfig_yaml: Optional[str] = None

class ClusterAuthResponse(BaseModel):
    is_authenticated: bool
    cluster_id: UUID
    cluster_name: str
    auth_method: str
    authenticated_identity: str
    kubernetes_version: str
    permissions: Dict[str, bool]
    authenticated_at: datetime
    message: str

class ClusterTestConnectionResponse(BaseModel):
    is_connected: bool
    is_authenticated: bool
    kubernetes_version: Optional[str] = None
    namespaces_count: int = 0
    can_manage_ingress: bool = True
    can_manage_traefik_crds: bool = True
    message: str

class CheckItem(BaseModel):
    id: str
    category: str
    name: str
    status: str  # 'PASSED', 'WARNING', 'FAILED'
    details: str
    latency_ms: Optional[int] = None
    evidence: Optional[Dict[str, Any]] = None

class PrerequisitesValidationResponse(BaseModel):
    cluster_id: UUID
    cluster_name: str
    cloud_provider: str
    overall_status: str  # 'PASSED', 'WARNING', 'FAILED'
    all_prerequisites_met: bool
    checks: List[CheckItem]
    validated_at: datetime
    message: str

