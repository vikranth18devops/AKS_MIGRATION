from typing import Any, Dict, List
import yaml
from app.services.canonical_ir import GatewayRouteIR

class TraefikAdapter:
    @classmethod
    def generate_manifests(cls, route_ir: GatewayRouteIR, ingress_class_name: str = "traefik-migration") -> List[Dict[str, Any]]:
        manifests: List[Dict[str, Any]] = []
        middleware_names: List[str] = []
        namespace = route_ir.namespace
        base_name = route_ir.name

        # 1. Generate Redirect Middleware if HTTPS redirect is specified
        if route_ir.redirect and route_ir.redirect.scheme == "https":
            mw_name = f"{base_name}-redirect-scheme"
            mw_redirect = {
                "apiVersion": "traefik.io/v1alpha1",
                "kind": "Middleware",
                "metadata": {
                    "name": mw_name,
                    "namespace": namespace,
                    "labels": {
                        "app.kubernetes.io/managed-by": "kmm-migration-manager"
                    }
                },
                "spec": {
                    "redirectScheme": {
                        "scheme": "https",
                        "permanent": route_ir.redirect.permanent
                    }
                }
            }
            manifests.append(mw_redirect)
            middleware_names.append(mw_name)

        # 2. Generate RateLimit Middleware
        if route_ir.rate_limit:
            mw_name = f"{base_name}-rate-limit"
            mw_ratelimit = {
                "apiVersion": "traefik.io/v1alpha1",
                "kind": "Middleware",
                "metadata": {
                    "name": mw_name,
                    "namespace": namespace,
                    "labels": {
                        "app.kubernetes.io/managed-by": "kmm-migration-manager"
                    }
                },
                "spec": {
                    "rateLimit": {
                        "average": route_ir.rate_limit.average_rps,
                        "burst": route_ir.rate_limit.burst
                    }
                }
            }
            manifests.append(mw_ratelimit)
            middleware_names.append(mw_name)

        # 3. Generate Buffering Middleware (Max Body Size)
        if route_ir.body_limit:
            mw_name = f"{base_name}-buffering"
            mw_buffering = {
                "apiVersion": "traefik.io/v1alpha1",
                "kind": "Middleware",
                "metadata": {
                    "name": mw_name,
                    "namespace": namespace,
                    "labels": {
                        "app.kubernetes.io/managed-by": "kmm-migration-manager"
                    }
                },
                "spec": {
                    "buffering": {
                        "maxRequestBodyBytes": route_ir.body_limit.max_body_bytes,
                        "memRequestBodyBytes": min(route_ir.body_limit.max_body_bytes, 2097152)
                    }
                }
            }
            manifests.append(mw_buffering)
            middleware_names.append(mw_name)

        # 4. Generate IPAllowList Middleware
        if route_ir.ip_allow_list and route_ir.ip_allow_list.source_range:
            mw_name = f"{base_name}-ip-allowlist"
            mw_ip = {
                "apiVersion": "traefik.io/v1alpha1",
                "kind": "Middleware",
                "metadata": {
                    "name": mw_name,
                    "namespace": namespace,
                    "labels": {
                        "app.kubernetes.io/managed-by": "kmm-migration-manager"
                    }
                },
                "spec": {
                    "ipAllowList": {
                        "sourceRange": route_ir.ip_allow_list.source_range
                    }
                }
            }
            manifests.append(mw_ip)
            middleware_names.append(mw_name)

        # 5. Generate ReplacePath or StripPrefix Middleware
        if route_ir.rewrite:
            if route_ir.rewrite.replace_path:
                mw_name = f"{base_name}-replace-path"
                mw_rewrite = {
                    "apiVersion": "traefik.io/v1alpha1",
                    "kind": "Middleware",
                    "metadata": {
                        "name": mw_name,
                        "namespace": namespace,
                        "labels": {
                            "app.kubernetes.io/managed-by": "kmm-migration-manager"
                        }
                    },
                    "spec": {
                        "replacePath": {
                            "path": route_ir.rewrite.replace_path
                        }
                    }
                }
                manifests.append(mw_rewrite)
                middleware_names.append(mw_name)

        # 6. Build Main Traefik IngressRoute
        ingress_route_routes = []
        host_condition = ""
        if route_ir.hosts:
            host_subclauses = [f"`{h}`" for h in route_ir.hosts]
            host_condition = f"Host({', '.join(host_subclauses)})"

        for p_idx, path_rule in enumerate(route_ir.path_rules or []):
            match_clause = host_condition
            if path_rule.path and path_rule.path != "/":
                path_clause = f"PathPrefix(`{path_rule.path}`)"
                match_clause = f"{host_condition} && {path_clause}" if host_condition else path_clause
            elif not match_clause:
                match_clause = "PathPrefix(`/`)"

            services = []
            for b in path_rule.backends:
                services.append({
                    "name": b.service_name,
                    "port": b.service_port,
                    "weight": b.weight
                })

            route_item: Dict[str, Any] = {
                "match": match_clause,
                "kind": "Rule",
                "services": services
            }

            if middleware_names:
                route_item["middlewares"] = [{"name": mw, "namespace": namespace} for mw in middleware_names]

            ingress_route_routes.append(route_item)

        ingress_route: Dict[str, Any] = {
            "apiVersion": "traefik.io/v1alpha1",
            "kind": "IngressRoute",
            "metadata": {
                "name": f"{base_name}-traefik",
                "namespace": namespace,
                "annotations": {
                    "kubernetes.io/ingress.class": ingress_class_name
                },
                "labels": {
                    "app.kubernetes.io/managed-by": "kmm-migration-manager"
                }
            },
            "spec": {
                "entryPoints": ["web", "websecure"],
                "routes": ingress_route_routes
            }
        }

        # Add TLS if configured
        if route_ir.tls_configs:
            tls_entry = {}
            secret_names = [t.secret_name for t in route_ir.tls_configs if t.secret_name]
            if secret_names:
                tls_entry["secretName"] = secret_names[0]
            ingress_route["spec"]["tls"] = tls_entry

        manifests.append(ingress_route)
        return manifests

    @classmethod
    def to_yaml_string(cls, manifests: List[Dict[str, Any]]) -> str:
        return yaml.dump_all(manifests, sort_keys=False, default_flow_style=False)
