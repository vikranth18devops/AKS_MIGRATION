import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_cluster_auth_gate_and_migration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Fetch clusters
        res = await ac.get("/api/v1/clusters")
        assert res.status_code == 200
        clusters = res.json()

        unauth_cluster = next((c for c in clusters if not c["is_authenticated"]), None)
        auth_cluster = next((c for c in clusters if c["is_authenticated"]), None)

        if not unauth_cluster:
            import uuid
            # Dynamically register an unauthenticated cluster
            new_c = await ac.post("/api/v1/clusters", json={
                "name": f"gke-unauth-{uuid.uuid4().hex[:8]}",
                "cloud_provider": "Google Cloud",
                "environment": "staging",
                "api_endpoint": "https://34.120.55.10",
                "kubernetes_version": "v1.28.3-gke"
            })
            assert new_c.status_code == 201
            unauth_cluster = new_c.json()

        assert unauth_cluster is not None, "Expected an unauthenticated cluster for gate testing"
        assert auth_cluster is not None, "Expected at least one authenticated cluster"

        # 2. Unauthenticated cluster: accessing resources MUST return 428 Precondition Required
        res_blocked = await ac.get(f"/api/v1/clusters/{unauth_cluster['id']}/resources")
        assert res_blocked.status_code == 428
        assert "Cluster authentication required" in res_blocked.json()["detail"]

        # 3. Unauthenticated cluster: creating migration MUST return 428 Precondition Required
        mig_blocked = await ac.post("/api/v1/migrations", json={
            "name": "Blocked Migration",
            "cluster_id": unauth_cluster["id"],
            "namespace": "production-apps",
            "application_name": "blocked-app",
            "production_url": "https://blocked.company.com",
            "target_controller": "TRAEFIK"
        })
        assert mig_blocked.status_code == 428
        assert "Cluster authentication required" in mig_blocked.json()["detail"]

        # 4. Authenticated cluster: accessing resources returns 200 with Ingress inventory
        res_ok = await ac.get(f"/api/v1/clusters/{auth_cluster['id']}/resources")
        assert res_ok.status_code == 200
        ingresses = res_ok.json()
        assert len(ingresses) > 0
        assert "payments-api-ingress" in [i["name"] for i in ingresses]

        # 5. Authenticate the unauthenticated cluster
        auth_res = await ac.post(f"/api/v1/clusters/{unauth_cluster['id']}/authenticate", json={
            "auth_method": "AZURE_WORKLOAD_IDENTITY",
            "token": "test-workload-token"
        })
        assert auth_res.status_code == 200
        assert auth_res.json()["is_authenticated"] is True
        assert auth_res.json()["permissions"]["can_read_ingress"] is True

        # 6. Once authenticated, resource access is unlocked!
        unlocked_res = await ac.get(f"/api/v1/clusters/{unauth_cluster['id']}/resources")
        assert unlocked_res.status_code == 200

        # 7. Test AWS Cloud with Account ID, Session Token, Region, IAM permissions
        aws_res = await ac.post("/api/v1/clusters/cloud-provider/AWS/authenticate", json={
            "aws_account_id": "123456789012",
            "access_key_id": "AKIAIOSFODNN7EXAMPLE",
            "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "role_arn": "arn:aws:iam::123456789012:role/kmm-eks-migration-role",
            "session_token": "AQoDYXdzEJr1EXAMPLETOKEN",
            "region": "us-east-1",
            "required_iam_permissions": "eks:DescribeCluster, eks:ListClusters, iam:PassRole, s3:PutObject",
            "cluster_name": "eks-production-us-east-1"
        })
        assert aws_res.status_code == 200
        assert aws_res.json()["status"] == "AUTHENTICATED"
        assert aws_res.json()["cloud_provider"] == "AWS"

        # 8. Test Azure with Tenant ID, Subscription ID, Client Secret, Resource Group, RBAC roles
        azure_res = await ac.post("/api/v1/clusters/cloud-provider/Azure/authenticate", json={
            "tenant_id": "72f988bf-86f1-41af-91ab-2d7cd011db47",
            "subscription_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "client_id": "9f8e7d6c-5b4a-3f2e-1d0c-b8a7f6e5d4c3",
            "client_secret": "sec_99a8b7c6d5e4f3a2b1c0_AZURE_KEY",
            "resource_group": "rg-kmm-production-eastus",
            "rbac_roles": "Azure Kubernetes Service Cluster Admin Role, Contributor",
            "cluster_name": "aks-staging-eastus"
        })
        assert azure_res.status_code == 200
        assert azure_res.json()["status"] == "AUTHENTICATED"
        assert azure_res.json()["cloud_provider"] == "Azure"

        # 9. Test Google Cloud (GCP) with Project ID, Service Account Email, Workload Identity, IAM roles, Region
        gcp_res = await ac.post("/api/v1/clusters/cloud-provider/GCP/authenticate", json={
            "project_id": "kmm-gcp-prod-402100",
            "service_account_email": "kmm-gke-sa@kmm-gcp-prod-402100.iam.gserviceaccount.com",
            "credentials_or_workload_identity": "//iam.googleapis.com/projects/402100/locations/global/workloadIdentityPools/kmm-pool",
            "iam_roles": "roles/container.admin, roles/storage.objectAdmin",
            "region": "us-central1",
            "cluster_name": "gke-production-us-central1"
        })
        assert gcp_res.status_code == 200
        assert gcp_res.json()["status"] == "AUTHENTICATED"

        # 10. Test On-Premises with Hostname, AD Domain, Credentials, LDAPS, SSH Key, SSL Cert, VPN, Ports
        onprem_res = await ac.post("/api/v1/clusters/cloud-provider/On-Premises/authenticate", json={
            "server_hostname_ip": "192.168.1.100",
            "domain_name": "CORP.INTERNAL",
            "username": "svc_kmm_operator",
            "password": "KmmSecurePass!2026",
            "domain_controller_details": "dc01.corp.internal:636 (LDAPS)",
            "auth_protocol": "LDAPS",
            "ssh_key": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...",
            "ssl_tls_certificates": "-----BEGIN CERTIFICATE-----\n...",
            "vpn_network_connectivity": "IPSec Site-to-Site Tunnel / WireGuard 10.200.0.1/24",
            "firewall_ports_whitelisting": "Port 6443, 443, 22 Whitelisted",
            "required_server_permissions": "cluster-admin, root sudoers",
            "cluster_name": "onprem-core-datacenter-01"
        })
        assert onprem_res.status_code == 200
        assert onprem_res.json()["status"] == "AUTHENTICATED"
        assert onprem_res.json()["cloud_provider"] == "On-Premises"

        # 11. Test Disconnect to ensure unauthenticated clouds are properly locked & greyed out
        for prov in ["Azure", "GCP", "On-Premises"]:
            disc_res = await ac.post(f"/api/v1/clusters/cloud-provider/{prov}/disconnect")
            assert disc_res.status_code == 200
            assert disc_res.json()["status"] == "DISCONNECTED"


