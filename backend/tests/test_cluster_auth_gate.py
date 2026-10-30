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
        assert len(clusters) >= 2

        unauth_cluster = next((c for c in clusters if not c["is_authenticated"]), None)
        auth_cluster = next((c for c in clusters if c["is_authenticated"]), None)

        assert unauth_cluster is not None, "Expected at least one unauthenticated cluster for gate testing"
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
