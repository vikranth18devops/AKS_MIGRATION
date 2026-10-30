# Technical Design Document (TDD) — Part 3: API Design

# Kubernetes Migration Manager (KMM) — REST & Real-Time API Specification

**Version:** 2.0  
**Status:** Implementation Blueprint  
**Standard:** OpenAPI 3.1.0 / JSON Schema Draft 2020-12  
**Protocol:** HTTPS REST + Server-Sent Events (SSE) & WebSockets  
**Base Path:** `/api/v1`  

---

## 1. Authentication, Headers & Common Conventions

### 1.1 Headers
All API calls must include standard headers:
- `Authorization: Bearer <jwt_token>` (Mandatory for authenticated endpoints)
- `X-Request-ID: <uuid>` (Correlation ID injected into audit logs and Temporal workflows)
- `X-Idempotency-Key: <string>` (Mandatory for mutating POST/PUT/DELETE actions)
- `Content-Type: application/json`

### 1.2 Error Response Format (RFC 7807 Problem Details)
```json
{
  "type": "https://api.kmm.io/errors/INCOMPATIBLE_CONFIGURATION",
  "title": "Configuration Contains Blocking NGINX Annotations",
  "status": 422,
  "detail": "The annotation 'nginx.ingress.kubernetes.io/server-snippet' cannot be automatically converted without manual review.",
  "instance": "/api/v1/migrations/8f2c3d1e-9a4b-4c7f-8e2d-1a2b3c4d5e6f/assess",
  "request_id": "req-9f8a7b6c-5d4e-3f2a-1b0c-9d8e7f6a5b4c",
  "invalid_params": [
    {
      "name": "nginx.ingress.kubernetes.io/server-snippet",
      "reason": "Lua or raw NGINX directive injection requires explicit controller extension."
    }
  ]
}
```

---

## 2. API Endpoint Catalog

| Endpoint | Method | RBAC Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/clusters` | GET | All | List registered Kubernetes clusters |
| `/api/v1/clusters` | POST | Admin | Register new Kubernetes cluster |
| `/api/v1/clusters/{id}/test-connection` | POST | Admin, DevOps | Validate live API & RBAC connectivity |
| `/api/v1/clusters/{id}/discover` | POST | DevOps, Admin | Trigger live discovery workflow |
| `/api/v1/clusters/{id}/resources` | GET | All | Retrieve discovered resources & ingress inventory |
| `/api/v1/migrations` | POST | DevOps, Admin | Create a new migration project |
| `/api/v1/migrations` | GET | All | List migrations with filter & pagination |
| `/api/v1/migrations/{id}` | GET | All | Retrieve comprehensive migration status & timeline |
| `/api/v1/migrations/{id}/assess` | POST | DevOps, Admin | Execute compatibility assessment against target |
| `/api/v1/migrations/{id}/diff` | GET | All | Side-by-side YAML diff (NGINX vs. Target Gateway) |
| `/api/v1/migrations/{id}/backups` | POST | DevOps, Admin | Generate and verify encrypted backup package |
| `/api/v1/migrations/{id}/backups` | GET | All | List backup history & checksum verifications |
| `/api/v1/migrations/{id}/deploy` | POST | DevOps, Admin | Deploy target controller & program routes |
| `/api/v1/migrations/{id}/runtime-endpoints` | GET | All | List temporary runtime URLs with health probe status |
| `/api/v1/migrations/{id}/test-assignments` | POST | DevOps, Admin | Assign developers to test runtime endpoints |
| `/api/v1/migrations/{id}/test-results` | POST | Developer | Submit developer testing test case results |
| `/api/v1/migrations/{id}/developer-approval` | POST | Developer | Submit formal developer sign-off or rejection |
| `/api/v1/migrations/{id}/cutover-requests` | POST | DevOps | Submit production cutover approval request |
| `/api/v1/cutover-requests/{id}/approve` | POST | DevOps Lead | Authorize production cutover execution |
| `/api/v1/cutover-requests/{id}/reject` | POST | DevOps Lead | Reject cutover request with required defect notes |
| `/api/v1/migrations/{id}/cutover` | POST | DevOps (Authorized)| Execute production traffic switch (ALB Target Group) |
| `/api/v1/migrations/{id}/rollback` | POST | DevOps, DevOps Lead| Trigger immediate traffic rollback to NGINX |
| `/api/v1/migrations/{id}/events` | GET (SSE) | All | Real-time event stream for migration activity timeline |
| `/api/v1/audit-events` | GET | Auditor, Admin | Query immutable audit log with filters |
| `/api/v1/integrations` | GET | All | Live health status of external integrations |

---

## 3. Detailed Request / Response Schemas

### 3.1 Cluster Registration & Discovery

#### `POST /api/v1/clusters`
**Request:**
```json
{
  "name": "eks-production-us-east-1",
  "cloud_provider": "AWS",
  "environment": "production",
  "api_endpoint": "https://A1B2C3D4E5.gr7.us-east-1.eks.amazonaws.com",
  "auth_method": "AWS_IAM_ROLE",
  "role_arn": "arn:aws:iam::123456789012:role/kmm-eks-access-role"
}
```
**Response (`201 Created`):**
```json
{
  "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "name": "eks-production-us-east-1",
  "cloud_provider": "AWS",
  "environment": "production",
  "api_endpoint": "https://A1B2C3D4E5.gr7.us-east-1.eks.amazonaws.com",
  "status": "REGISTERED",
  "created_at": "2026-10-30T12:00:00Z"
}
```

---

### 3.2 Compatibility Assessment

#### `POST /api/v1/migrations/{id}/assess`
**Request:**
```json
{
  "target_controller": "TRAEFIK",
  "force_reassess": false
}
```
**Response (`200 OK`):**
```json
{
  "assessment_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "migration_id": "8f2c3d1e-9a4b-4c7f-8e2d-1a2b3c4d5e6f",
  "target_controller": "TRAEFIK",
  "is_compatible": true,
  "summary": {
    "total_rules": 8,
    "blocker_count": 0,
    "warning_count": 1,
    "info_count": 4
  },
  "findings": [
    {
      "id": "f1a2b3c4-0001",
      "severity": "INFO",
      "annotation_or_feature": "nginx.ingress.kubernetes.io/ssl-redirect",
      "source_value": "true",
      "target_mapping": "Traefik Middleware: RedirectScheme (scheme=https, permanent=true)",
      "is_resolved": true
    },
    {
      "id": "f1a2b3c4-0002",
      "severity": "WARNING",
      "annotation_or_feature": "nginx.ingress.kubernetes.io/proxy-body-size",
      "source_value": "50m",
      "target_mapping": "Traefik Middleware: Buffering (maxRequestBodyBytes=52428800)",
      "is_resolved": true
    }
  ],
  "canonical_ir": {
    "hosts": ["api.company.com"],
    "paths": [
      {
        "path": "/v1",
        "match_type": "Prefix",
        "backend_service": "api-service",
        "backend_port": 8080
      }
    ]
  }
}
```

---

### 3.3 Target Deployment & Runtime URL Verification

#### `POST /api/v1/migrations/{id}/deploy`
**Request:**
```json
{
  "target_controller": "TRAEFIK",
  "deployment_strategy": "PARALLEL_ISOLATED",
  "namespace": "kmm-traefik-system",
  "helm_values_override": {
    "deployment": {
      "replicas": 3
    },
    "ingressClass": {
      "name": "traefik-migration",
      "isDefaultClass": false
    }
  }
}
```
**Response (`202 Accepted`):**
```json
{
  "workflow_id": "wf-deploy-traefik-8f2c3d1e",
  "status": "DEPLOYING_TARGET",
  "message": "Traefik deployment triggered in isolated namespace kmm-traefik-system. Track progress via SSE event stream."
}
```

#### `GET /api/v1/migrations/{id}/runtime-endpoints`
**Response (`200 OK`):**
```json
[
  {
    "id": "r1a2b3c4-d5e6",
    "runtime_hostname": "runtime-api.company.com",
    "production_hostname": "api.company.com",
    "target_controller": "TRAEFIK",
    "dns_status": "PROPAGATED",
    "tls_status": "VALID",
    "http_health_status": "HEALTHY",
    "http_status_code": 200,
    "latency_ms": 42,
    "assigned_developers": ["developer@company.com"],
    "last_probed_at": "2026-10-30T12:30:00Z"
  }
]
```

---

### 3.4 Developer & DevOps Lead Dual Approval

#### `POST /api/v1/migrations/{id}/developer-approval`
**Request:**
```json
{
  "status": "APPROVED",
  "comments": "Validated API endpoints, CORS, WebSockets, and authentication headers on runtime-api.company.com. All 14 smoke tests passed.",
  "evidence_artifact_ids": ["e1a2b3c4-5d6e-7f8a-9b0c"]
}
```
**Response (`200 OK`):**
```json
{
  "approval_id": "ap-dev-8f2c3d1e",
  "type": "DEVELOPER_TESTING",
  "status": "APPROVED",
  "signed_by": "developer@company.com",
  "signed_at": "2026-10-30T12:35:00Z",
  "next_step": "AWAITING_PRODUCTION_APPROVAL"
}
```

#### `POST /api/v1/cutover-requests/{id}/approve`
**Request:**
```json
{
  "comments": "Backup verified in S3. Developer testing approved. Approved for change window 2026-10-30 14:00-15:00 UTC.",
  "change_ticket_ref": "CHG-2026-8891"
}
```
**Response (`200 OK`):**
```json
{
  "cutover_request_id": "cr-8f2c3d1e",
  "status": "APPROVED_FOR_CUTOVER",
  "approved_by": "devops-lead@company.com",
  "approved_at": "2026-10-30T12:40:00Z"
}
```

---

### 3.5 Production Cutover & Emergency Rollback

#### `POST /api/v1/migrations/{id}/cutover`
**Request:**
```json
{
  "cutover_strategy": "ALB_TARGET_GROUP_INSTANT",
  "connection_draining_seconds": 300,
  "stabilization_window_seconds": 600
}
```
**Response (`202 Accepted`):**
```json
{
  "cutover_execution_id": "ce-8f2c3d1e",
  "status": "CUTTING_OVER",
  "switched_at": "2026-10-30T12:42:00Z",
  "monitoring_status": "ACTIVE_MONITORING"
}
```

#### `POST /api/v1/migrations/{id}/rollback`
**Request:**
```json
{
  "reason": "Observed 3.8% HTTP 502 errors from backend service after cutover.",
  "force_immediate": true
}
```
**Response (`200 OK`):**
```json
{
  "rollback_execution_id": "rb-8f2c3d1e",
  "status": "ROLLED_BACK",
  "restored_target_group_arn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kmm-nginx-prod/123456",
  "nginx_traffic_verified": true,
  "restored_at": "2026-10-30T12:43:10Z"
}
```

---

### 3.6 Real-Time Activity Streaming (Server-Sent Events)

#### `GET /api/v1/migrations/{id}/events`
**Headers:**
`Accept: text/event-stream`

**Stream Payloads:**
```
event: STATE_CHANGE
data: {"sequence": 14, "from_state": "RUNTIME_TESTING", "to_state": "DEVELOPER_APPROVED", "actor": "developer@company.com", "timestamp": "2026-10-30T12:35:00Z"}

event: HEALTH_METRIC
data: {"sequence": 15, "timestamp": "2026-10-30T12:42:10Z", "http_2xx": 1420, "http_5xx": 0, "latency_p95_ms": 48.2, "status": "NOMINAL"}

event: WORKFLOW_STEP_COMPLETED
data: {"sequence": 16, "step": "SWITCH_ALB_TARGET_GROUP", "status": "SUCCESS", "elapsed_ms": 1240}
```

---

*This concludes Part 3: API Design. Proceed to Part 4 for the Sprint Planning and Development Backlog.*
