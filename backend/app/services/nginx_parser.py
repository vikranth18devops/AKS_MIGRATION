import re
from typing import Any, Dict, List, Tuple
from pydantic import BaseModel
from app.services.canonical_ir import (
    AuthPolicyIR,
    BackendIR,
    BodyLimitPolicyIR,
    GatewayRouteIR,
    HeadersPolicyIR,
    IPAllowListPolicyIR,
    PathRuleIR,
    RateLimitPolicyIR,
    RedirectPolicyIR,
    RewritePolicyIR,
    TLSPolicyIR,
    TimeoutPolicyIR,
)

class Finding(BaseModel):
    severity: str  # 'INFO', 'WARNING', 'BLOCKER'
    annotation: str
    source_value: str
    target_mapping: str
    remediation_suggestion: str
    is_blocking: bool = False

class NginxAssessmentResult(BaseModel):
    is_compatible: bool
    blocker_count: int
    warning_count: int
    info_count: int
    findings: List[Finding]
    canonical_ir: GatewayRouteIR

class NginxAnnotationParser:
    @staticmethod
    def parse_size_to_bytes(size_str: str) -> int:
        match = re.match(r"^(\d+)([kKmMgG]?)$", size_str.strip())
        if not match:
            return 10485760  # Default 10MB
        number = int(match.group(1))
        unit = match.group(2).lower()
        if unit == "k":
            return number * 1024
        elif unit == "m":
            return number * 1024 * 1024
        elif unit == "g":
            return number * 1024 * 1024 * 1024
        return number

    @classmethod
    def parse_ingress(cls, ingress_dict: Dict[str, Any]) -> NginxAssessmentResult:
        metadata = ingress_dict.get("metadata", {})
        spec = ingress_dict.get("spec", {})
        annotations = metadata.get("annotations", {}) or {}
        name = metadata.get("name", "unnamed-ingress")
        namespace = metadata.get("namespace", "default")

        findings: List[Finding] = []
        blocker_count = 0
        warning_count = 0
        info_count = 0

        # 1. Parse Hosts and Path Rules
        hosts: List[str] = []
        path_rules: List[PathRuleIR] = []
        for rule in spec.get("rules", []):
            host = rule.get("host")
            if host:
                hosts.append(host)
            http = rule.get("http", {})
            for p in http.get("paths", []):
                backend_info = p.get("backend", {}).get("service", {})
                service_name = backend_info.get("name", "")
                service_port = backend_info.get("port", {}).get("number", 80)
                path_rules.append(
                    PathRuleIR(
                        path=p.get("path", "/"),
                        match_type=p.get("pathType", "Prefix"),
                        backends=[BackendIR(service_name=service_name, service_port=service_port, namespace=namespace)]
                    )
                )

        # 2. Parse TLS
        tls_configs: List[TLSPolicyIR] = []
        for t in spec.get("tls", []):
            secret_name = t.get("secretName", "")
            tls_hosts = t.get("hosts", [])
            tls_configs.append(TLSPolicyIR(secret_name=secret_name, hosts=tls_hosts))

        # 3. Parse Policies from NGINX Annotations
        rewrite_policy: RewritePolicyIR = None
        redirect_policy: RedirectPolicyIR = None
        rate_limit_policy: RateLimitPolicyIR = None
        headers_policy: HeadersPolicyIR = HeadersPolicyIR()
        auth_policy: AuthPolicyIR = None
        timeout_policy: TimeoutPolicyIR = None
        body_limit_policy: BodyLimitPolicyIR = None
        ip_allow_list_policy: IPAllowListPolicyIR = None

        for key, val in annotations.items():
            # SSL Redirect
            if key == "nginx.ingress.kubernetes.io/ssl-redirect":
                is_ssl = val.lower() == "true"
                headers_policy.ssl_redirect = is_ssl
                if is_ssl:
                    redirect_policy = RedirectPolicyIR(scheme="https", permanent=True)
                findings.append(Finding(
                    severity="INFO",
                    annotation=key,
                    source_value=val,
                    target_mapping="Traefik Middleware: RedirectScheme",
                    remediation_suggestion="Mapped to Traefik RedirectScheme middleware."
                ))
                info_count += 1

            # Rewrite Target
            elif key == "nginx.ingress.kubernetes.io/rewrite-target":
                rewrite_policy = RewritePolicyIR(replace_path=val)
                findings.append(Finding(
                    severity="INFO",
                    annotation=key,
                    source_value=val,
                    target_mapping="Traefik Middleware: ReplacePath / StripPrefix",
                    remediation_suggestion="Mapped to Traefik ReplacePath or StripPrefix middleware."
                ))
                info_count += 1

            # Proxy Body Size
            elif key == "nginx.ingress.kubernetes.io/proxy-body-size":
                size_bytes = cls.parse_size_to_bytes(val)
                body_limit_policy = BodyLimitPolicyIR(max_body_bytes=size_bytes)
                findings.append(Finding(
                    severity="WARNING",
                    annotation=key,
                    source_value=val,
                    target_mapping="Traefik Middleware: Buffering (maxRequestBodyBytes)",
                    remediation_suggestion=f"Converted {val} to {size_bytes} bytes in Traefik Buffering middleware."
                ))
                warning_count += 1

            # Whitelist Source Range
            elif key == "nginx.ingress.kubernetes.io/whitelist-source-range":
                cidrs = [c.strip() for c in val.split(",") if c.strip()]
                ip_allow_list_policy = IPAllowListPolicyIR(source_range=cidrs)
                findings.append(Finding(
                    severity="INFO",
                    annotation=key,
                    source_value=val,
                    target_mapping="Traefik Middleware: IPAllowList",
                    remediation_suggestion=f"Configured IPAllowList with {len(cidrs)} CIDR blocks."
                ))
                info_count += 1

            # Rate Limiting
            elif key == "nginx.ingress.kubernetes.io/limit-rps":
                try:
                    rps = int(val)
                    rate_limit_policy = RateLimitPolicyIR(average_rps=rps, burst=rps * 2)
                    findings.append(Finding(
                        severity="INFO",
                        annotation=key,
                        source_value=val,
                        target_mapping="Traefik Middleware: RateLimit",
                        remediation_suggestion=f"Mapped to Traefik RateLimit (average={rps}, burst={rps*2})."
                    ))
                    info_count += 1
                except ValueError:
                    pass

            # Basic Auth
            elif key == "nginx.ingress.kubernetes.io/auth-type" and val.lower() == "basic":
                auth_secret = annotations.get("nginx.ingress.kubernetes.io/auth-secret", "")
                auth_policy = AuthPolicyIR(auth_type="BasicAuth", secret_name=auth_secret)
                findings.append(Finding(
                    severity="INFO",
                    annotation=key,
                    source_value=val,
                    target_mapping="Traefik Middleware: BasicAuth",
                    remediation_suggestion=f"Mapped to Traefik BasicAuth referencing secret '{auth_secret}'."
                ))
                info_count += 1

            # Forward Auth
            elif key == "nginx.ingress.kubernetes.io/auth-url":
                auth_policy = AuthPolicyIR(auth_type="ForwardAuth", forward_url=val)
                findings.append(Finding(
                    severity="WARNING",
                    annotation=key,
                    source_value=val,
                    target_mapping="Traefik Middleware: ForwardAuth",
                    remediation_suggestion="Configured Traefik ForwardAuth with target authentication URL."
                ))
                warning_count += 1

            # Timeouts
            elif "timeout" in key:
                try:
                    timeout_val = int(val)
                    timeout_policy = TimeoutPolicyIR(connect_seconds=timeout_val, response_seconds=timeout_val)
                    findings.append(Finding(
                        severity="INFO",
                        annotation=key,
                        source_value=val,
                        target_mapping="Traefik Service / ServersTransport timeout",
                        remediation_suggestion=f"Configured transport timeouts to {timeout_val} seconds."
                    ))
                    info_count += 1
                except ValueError:
                    pass

            # Custom Snippets (BLOCKERS)
            elif "snippet" in key:
                findings.append(Finding(
                    severity="BLOCKER",
                    annotation=key,
                    source_value=val[:80] + ("..." if len(val) > 80 else ""),
                    target_mapping="UNSUPPORTED: Raw NGINX directive injection",
                    remediation_suggestion="Raw NGINX lua/server snippets cannot be automatically converted. Manual review and custom Traefik plugin or middleware is required.",
                    is_blocking=True
                ))
                blocker_count += 1

        route_ir = GatewayRouteIR(
            name=name,
            namespace=namespace,
            hosts=hosts,
            path_rules=path_rules,
            tls_configs=tls_configs,
            rewrite=rewrite_policy,
            redirect=redirect_policy,
            rate_limit=rate_limit_policy,
            headers=headers_policy,
            auth=auth_policy,
            timeout=timeout_policy,
            body_limit=body_limit_policy,
            ip_allow_list=ip_allow_list_policy,
            raw_annotations=annotations
        )

        return NginxAssessmentResult(
            is_compatible=(blocker_count == 0),
            blocker_count=blocker_count,
            warning_count=warning_count,
            info_count=info_count,
            findings=findings,
            canonical_ir=route_ir
        )
