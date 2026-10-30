# Kubernetes Migration Manager (KMM)

> **Automated Kubernetes Ingress-to-Gateway Migration Platform with Zero Planned Downtime**

[![Architecture: AWS EKS](https://img.shields.io/badge/Architecture-AWS%20EKS%20%7C%20Gateway%20API-blue.svg)](docs/01_system_design.md)
[![Target: Traefik](https://img.shields.io/badge/Target-Traefik%20v3.0-purple.svg)](docs/01_system_design.md)
[![Database: PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL%2016%20Append--Only%20Audit-336791.svg)](docs/02_database_design.md)
[![License: Proprietary](https://img.shields.io/badge/License-Enterprise-green.svg)]()

---

## 1. System Overview

Kubernetes Migration Manager (KMM) orchestrates the safe, zero-planned-downtime migration of production Kubernetes application traffic from legacy **NGINX Ingress Controller** to modern gateway controllers: **Traefik**, **Envoy Gateway**, or **Istio Gateway**.

### Key Architectural Tenets
1. **Live Infrastructure Reality**: All cluster discovery, resource inspections, health evaluations, and cutover verifications run against live Kubernetes and Cloud Provider APIs without mock production data.
2. **Durable Asynchronous Workflows**: Long-running infrastructure migrations run inside **Temporal.io** stateful workflows surviving worker restarts with zero state loss.
3. **Canonical Intermediate Representation (IR)**: Ingress rules, TLS terminations, path transforms, rate-limiting, and headers are decoupled into a vendor-neutral `GatewayRouteIR`.
4. **Append-Only Immutable Auditing**: Protected by PostgreSQL database-level triggers preventing `UPDATE` and `DELETE` on `audit_events`.
5. **Zero-Planned-Downtime Traffic Handover**: Leverages AWS ALB Target Group bindings to shift production traffic from `TG-NGINX-Prod` to `TG-Traefik-Migration` with 300s connection draining, keeping main URLs intact without DNS cache lag.
6. **Circuit Breaker Rollback Engine**: Monitors post-cutover telemetry (5xx error rate $> 2\%$ or latency $> 2\times$ baseline) to automatically trigger an immediate ALB Target Group reversion back to NGINX within 60 seconds.

---

## 2. Technical Documentation Suite

| Document | Description |
| :--- | :--- |
| **[PRD v2.0](file:///Users/aarvik/Documents/AKS_INGRESS_TRAEFIK/docs/PRD.md)** | Official baseline Product Requirements Document |
| **[Part 1: System Design](file:///Users/aarvik/Documents/AKS_INGRESS_TRAEFIK/docs/01_system_design.md)** | Subsystems, AWS EKS deployment topology, Traefik adapter, sequence flows |
| **[Part 2: Database Design](file:///Users/aarvik/Documents/AKS_INGRESS_TRAEFIK/docs/02_database_design.md)** | PostgreSQL 16 schema, 34 entities, DDL, immutable audit trigger, ER diagram |
| **[Part 3: API Design](file:///Users/aarvik/Documents/AKS_INGRESS_TRAEFIK/docs/03_api_design.md)** | Complete OpenAPI 3.1 & REST specifications, SSE event streaming |
| **[Part 4: Development Backlog](file:///Users/aarvik/Documents/AKS_INGRESS_TRAEFIK/docs/04_development_backlog.md)** | 8 Epics, user stories, acceptance criteria (AC-001–AC-030), Sprint roadmap |

---

## 3. Directory Layout

```
.
├── backend/                        # FastAPI Backend & Orchestration Core
│   ├── app/
│   │   ├── api/v1/                 # Versioned REST Routers & SSE Event Hub
│   │   ├── core/                   # Config, Database Engine, Security & RBAC
│   │   ├── models/                 # SQLAlchemy 2.0 Async PostgreSQL Models (34 Entities)
│   │   ├── schemas/                # Pydantic v2 Request/Response Schemas
│   │   └── services/               # Canonical IR, NGINX AST Parser, Traefik Adapter, S3 Backup
│   ├── tests/                      # Automated Test Suite (Pytest)
│   └── requirements.txt
├── frontend/                       # React 18 + TypeScript + Vite Web Portal
│   ├── src/
│   │   ├── components/             # Dashboard, Migration Studio, Developer Portal, Cutover Console
│   │   ├── services/               # API & SSE Stream Client
│   │   └── types/                  # TypeScript Data Models
│   ├── index.html
│   └── package.json
├── docs/                           # Official Technical Design Documents & PRD
├── docker-compose.yml              # Complete Local Stack (PostgreSQL 16, Redis, MinIO, App)
└── README.md
```

---

## 4. Quickstart & Running Locally

### Option A: Docker Compose (Full Stack)
```bash
docker compose up --build
```
- Web Portal: `http://localhost:3000`
- REST API & OpenAPI Docs: `http://localhost:8000/api/v1/docs`
- MinIO S3 Console: `http://localhost:9001` (User: `minioadmin`, Password: `minioadminpassword`)

### Option B: Local Development
#### 1. Backend Service:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Run Test Suite:
```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests
```

#### 3. Frontend Web Portal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
