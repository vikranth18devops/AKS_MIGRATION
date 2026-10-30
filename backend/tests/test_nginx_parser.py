import pytest
from app.services.nginx_parser import NginxAnnotationParser
from app.services.traefik_adapter import TraefikAdapter

def test_nginx_parser_standard_annotations():
    sample_ingress = {
        "metadata": {
            "name": "payment-api",
            "namespace": "production",
            "annotations": {
                "kubernetes.io/ingress.class": "nginx",
                "nginx.ingress.kubernetes.io/ssl-redirect": "true",
                "nginx.ingress.kubernetes.io/proxy-body-size": "25m",
                "nginx.ingress.kubernetes.io/limit-rps": "150",
                "nginx.ingress.kubernetes.io/whitelist-source-range": "10.0.0.0/16"
            }
        },
        "spec": {
            "rules": [
                {
                    "host": "payment.company.com",
                    "http": {
                        "paths": [
                            {
                                "path": "/pay",
                                "pathType": "Prefix",
                                "backend": {
                                    "service": {
                                        "name": "payment-svc",
                                        "port": {"number": 8080}
                                    }
                                }
                            }
                        ]
                    }
                }
            ],
            "tls": [
                {
                    "hosts": ["payment.company.com"],
                    "secretName": "payment-tls"
                }
            ]
        }
    }

    result = NginxAnnotationParser.parse_ingress(sample_ingress)
    assert result.is_compatible is True
    assert result.blocker_count == 0
    assert result.canonical_ir.hosts == ["payment.company.com"]
    assert result.canonical_ir.body_limit.max_body_bytes == 25 * 1024 * 1024
    assert result.canonical_ir.rate_limit.average_rps == 150
    assert result.canonical_ir.ip_allow_list.source_range == ["10.0.0.0/16"]

def test_nginx_parser_blocking_annotation():
    sample_ingress = {
        "metadata": {
            "name": "legacy-app",
            "namespace": "default",
            "annotations": {
                "nginx.ingress.kubernetes.io/server-snippet": "lua_shared_dict my_dict 10m;"
            }
        },
        "spec": {
            "rules": [{"host": "legacy.company.com", "http": {"paths": [{"path": "/"}]}}]
        }
    }

    result = NginxAnnotationParser.parse_ingress(sample_ingress)
    assert result.is_compatible is False
    assert result.blocker_count == 1
    assert result.findings[0].severity == "BLOCKER"

def test_traefik_manifest_generation():
    sample_ingress = {
        "metadata": {
            "name": "order-service",
            "namespace": "orders",
            "annotations": {
                "nginx.ingress.kubernetes.io/ssl-redirect": "true",
                "nginx.ingress.kubernetes.io/limit-rps": "100"
            }
        },
        "spec": {
            "rules": [
                {
                    "host": "orders.company.com",
                    "http": {
                        "paths": [
                            {
                                "path": "/api",
                                "pathType": "Prefix",
                                "backend": {
                                    "service": {
                                        "name": "orders-svc",
                                        "port": {"number": 3000}
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }

    parse_result = NginxAnnotationParser.parse_ingress(sample_ingress)
    manifests = TraefikAdapter.generate_manifests(parse_result.canonical_ir)
    
    kinds = [m["kind"] for m in manifests]
    assert "Middleware" in kinds
    assert "IngressRoute" in kinds

    yaml_str = TraefikAdapter.to_yaml_string(manifests)
    assert "traefik.io/v1alpha1" in yaml_str
    assert "orders.company.com" in yaml_str
