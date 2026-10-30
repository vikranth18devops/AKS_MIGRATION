from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class BackendIR(BaseModel):
    service_name: str
    service_port: int
    namespace: Optional[str] = None
    weight: int = 100

class PathRuleIR(BaseModel):
    path: str = "/"
    match_type: str = "Prefix"  # "Exact", "Prefix", "Regex"
    backends: List[BackendIR] = Field(default_factory=list)

class RewritePolicyIR(BaseModel):
    strip_prefix: Optional[List[str]] = None
    replace_path: Optional[str] = None
    regex_rewrite: Optional[str] = None

class RedirectPolicyIR(BaseModel):
    scheme: str = "https"
    permanent: bool = True
    port: Optional[int] = None

class RateLimitPolicyIR(BaseModel):
    average_rps: int = 100
    burst: int = 50

class HeadersPolicyIR(BaseModel):
    ssl_redirect: bool = True
    custom_request_headers: Dict[str, str] = Field(default_factory=dict)
    custom_response_headers: Dict[str, str] = Field(default_factory=dict)
    cors_allow_origins: List[str] = Field(default_factory=list)
    cors_allow_methods: List[str] = Field(default_factory=list)
    cors_allow_headers: List[str] = Field(default_factory=list)

class AuthPolicyIR(BaseModel):
    auth_type: str = "BasicAuth"  # "BasicAuth", "ForwardAuth"
    secret_name: Optional[str] = None
    forward_url: Optional[str] = None
    auth_response_headers: List[str] = Field(default_factory=list)

class TimeoutPolicyIR(BaseModel):
    connect_seconds: int = 30
    response_seconds: int = 60

class BodyLimitPolicyIR(BaseModel):
    max_body_bytes: int = 10485760  # Default 10MB

class IPAllowListPolicyIR(BaseModel):
    source_range: List[str] = Field(default_factory=list)

class TLSPolicyIR(BaseModel):
    secret_name: str
    hosts: List[str] = Field(default_factory=list)
    min_version: str = "VersionTLS12"

class GatewayRouteIR(BaseModel):
    name: str
    namespace: str
    hosts: List[str] = Field(default_factory=list)
    path_rules: List[PathRuleIR] = Field(default_factory=list)
    tls_configs: List[TLSPolicyIR] = Field(default_factory=list)
    rewrite: Optional[RewritePolicyIR] = None
    redirect: Optional[RedirectPolicyIR] = None
    rate_limit: Optional[RateLimitPolicyIR] = None
    headers: Optional[HeadersPolicyIR] = None
    auth: Optional[AuthPolicyIR] = None
    timeout: Optional[TimeoutPolicyIR] = None
    body_limit: Optional[BodyLimitPolicyIR] = None
    ip_allow_list: Optional[IPAllowListPolicyIR] = None
    raw_annotations: Dict[str, str] = Field(default_factory=dict)
