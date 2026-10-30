# Product Requirements Document (PRD)

# Kubernetes Migration Manager (KMM)

**Version:** 2.0\
**Status:** Implementation Baseline\
**Product Type:** Web-based Kubernetes DevOps Automation Platform\
**Source:** NGINX Ingress\
**Target Controllers:** Traefik, Envoy Gateway, Istio Gateway\
**Primary Owner:** DevOps Engineer\
**Approval Authority:** DevOps Lead\
**Configuration Standard:** Kubernetes Gateway API, with controller-specific adapters

---

## 1. Executive Summary

Kubernetes Migration Manager (KMM) is a web-based DevOps automation platform designed to migrate production Kubernetes application traffic from NGINX Ingress to Traefik, Envoy Gateway or Istio Gateway.

The platform provides an end-to-end migration workflow, including:

- Live Kubernetes cluster discovery.
- NGINX Ingress configuration assessment.
- Target gateway compatibility analysis.
- Automated configuration conversion.
- Pre-migration backup and verification.
- Target gateway deployment.
- Temporary runtime URL generation.
- Developer application testing and approval.
- Production cutover approval.
- Controlled production traffic switching.
- Real-time infrastructure and application monitoring.
- Automated and manual rollback.
- Complete audit history and migration reporting.

KMM must interact with actual Kubernetes clusters and connected infrastructure. Production functionality must not depend on mock data, fabricated metrics, simulated workflow progress or hardcoded resource information.

Every operation must be tracked and verified against its actual execution result.

## 2. Business Objectives

1. Reduce manual effort involved in Kubernetes ingress migration.
2. Minimize planned application downtime.
3. Provide a standardized migration process across multiple gateway controllers.
4. Make DevOps engineers responsible for migration execution.
5. Allow developers to validate applications independently.
6. Require separate authorization for production cutover.
7. Maintain an independently verifiable rollback path.
8. Provide real-time visibility into migration operations.
9. Maintain complete audit records for user and system activities.
10. Support multiple Kubernetes clusters and namespaces.
11. Prevent unsafe migration when prerequisites are not satisfied.
12. Make migration operations durable, recoverable and repeatable.

## 3. Product Scope

### 3.1 In Scope

- Kubernetes cluster registration and connectivity.
- Live resource discovery.
- NGINX Ingress discovery.
- Configuration compatibility assessment.
- Traefik integration.
- Envoy Gateway integration.
- Istio Gateway integration.
- Kubernetes Gateway API integration.
- Configuration conversion.
- Backup and recovery.
- Gateway deployment and validation.
- Temporary runtime URL generation.
- Developer testing and approval.
- Production approval and cutover.
- Health monitoring.
- Rollback.
- Audit and reporting.
- RBAC and enterprise authentication.
- Real-time activity tracking.
- Integration with DNS, load balancers, monitoring and secrets management.

### 3.2 Out of Scope for Initial Release

- Application source-code migration.
- Database migration.
- Automatic application architecture redesign.
- Automatic full service-mesh migration.
- Automatic enabling of Istio sidecar injection or ambient mesh.
- Automatic enabling of mTLS without explicit approval.
- Unapproved production traffic changes.

Gateway-only migration must remain separate from full service-mesh migration.

## 4. User Roles and Responsibilities

| Role                   | Responsibilities                                               |
| ---------------------- | -------------------------------------------------------------- |
| Platform Administrator | Configure KMM, clusters, users, permissions and integrations   |
| DevOps Engineer        | Own and execute the migration                                  |
| Developer              | Test runtime URLs and approve or reject application validation |
| DevOps Lead            | Review and approve production cutover                          |
| Auditor                | Review migration history and audit records                     |

### 4.1 DevOps Engineer

The DevOps Engineer is the primary migration owner.

Responsibilities:

1. Select the Kubernetes cluster.
2. Select the namespace and application.
3. Discover existing NGINX Ingress resources.
4. Run configuration assessment.
5. Select the target gateway.
6. Review conversion findings.
7. Resolve unsupported configuration.
8. Create and verify backups.
9. Deploy the target gateway.
10. Apply converted configurations.
11. Validate target infrastructure.
12. Generate temporary runtime URLs.
13. Assign runtime URLs to developers.
14. Track developer testing.
15. Submit production cutover requests.
16. Execute approved cutover.
17. Monitor production health.
18. Initiate rollback when required.
19. Complete migration and generate reports.

### 4.2 Developer

Developers can:

- View assigned migrations.
- Access assigned runtime URLs.
- Test application functionality.
- Validate API endpoints.
- Validate authentication and authorization.
- Record test results.
- Attach permitted evidence.
- Approve or reject application testing.
- Provide comments and defects.

Developers must not have infrastructure write permissions through KMM.

### 4.3 DevOps Lead

The DevOps Lead can:

- Review assessment reports.
- Review backup verification.
- Review developer testing.
- Review cutover readiness.
- Approve or reject production cutover.
- Request additional validation.
- Review production incidents and rollback records.

Approvals must be associated with the exact migration configuration version and cutover plan.

## 5. Core Product Principles

1. Live infrastructure data only.
2. No mock production data.
3. No fabricated deployment status.
4. No simulated progress.
5. Every action must be tracked.
6. Every migration must have an assigned DevOps owner.
7. Every infrastructure operation must have a verified result.
8. Every approval must have an authenticated identity.
9. Every configuration change must be versioned.
10. Every migration must have a verified backup and rollback strategy.
11. Every workflow must survive supported service restarts.
12. Every external integration failure must be visible.
13. Every production operation must be authorized.
14. NGINX must remain available throughout the agreed stabilization period.

## 6. End-to-End Migration Workflow

### Stage 1: Cluster Selection

The DevOps Engineer logs in and selects a registered Kubernetes cluster.

KMM must:

- Verify cluster connectivity.
- Display cluster version.
- Display cluster identity.
- Display available namespaces.
- Display connection health.
- Verify required permissions.

### Stage 2: Live Discovery

KMM discovers:

- Namespaces.
- Deployments.
- Pods.
- Services.
- EndpointSlices.
- Ingress resources.
- IngressClasses.
- NGINX annotations.
- ConfigMaps.
- Relevant Secret metadata.
- Helm releases.
- Gateway API resources.
- Installed controller CRDs.

All discovery information must come from actual Kubernetes API responses.

### Stage 3: Application Selection

The DevOps Engineer selects the application and associated ingress resources.

KMM generates a source configuration inventory.

### Stage 4: Compatibility Assessment

KMM analyzes:

- Host rules.
- Path rules.
- Path rewrites.
- TLS.
- Headers.
- Authentication.
- Rate limiting.
- CORS.
- Timeouts.
- Body-size restrictions.
- WebSockets.
- gRPC.
- TCP and UDP routing.
- Custom NGINX annotations.
- Snippets.
- External dependencies.

Each finding must be classified as:

- Supported.
- Partially supported.
- Unsupported.
- Requires manual configuration.
- Requires infrastructure integration.

Blocking findings must prevent progression until resolved or explicitly handled through an approved remediation process.

### Stage 5: Target Selection

The DevOps Engineer selects:

- Traefik.
- Envoy Gateway.
- Istio Gateway.

KMM must discover installed versions and validate feature support.

### Stage 6: Configuration Conversion

KMM converts NGINX configuration into a common routing representation.

It then generates the selected controller's required resources.

Generated resources must be versioned and available for review before deployment.

### Stage 7: Backup

KMM creates and verifies a pre-migration backup containing relevant:

- Ingress resources.
- IngressClass resources.
- ConfigMaps.
- Referenced TLS Secrets.
- Helm release metadata.
- Controller values.
- Gateway API resources.
- Controller-specific resources.
- DNS configuration.
- Load balancer configuration.
- Source routing configuration.

Backup artifacts must be encrypted and checksummed.

Cutover must be blocked if mandatory backup verification fails.

### Stage 8: Target Gateway Deployment

KMM deploys the target gateway using an approved deployment method.

It verifies:

- Controller pods.
- Readiness.
- Services.
- Endpoints.
- GatewayClass acceptance.
- Gateway programming status.
- Route acceptance.
- Backend references.
- TLS.
- Controller logs.

The existing NGINX production traffic path must remain unchanged.

### Stage 9: Runtime URL Generation

KMM generates temporary runtime URLs routed through the new gateway.

It validates:

- DNS resolution.
- TLS handshake.
- Certificate validity.
- Gateway routing.
- Backend availability.
- Application response.

### Stage 10: DevOps Validation

The DevOps Engineer validates infrastructure and routing.

Only after infrastructure validation passes can developer testing be assigned.

### Stage 11: Developer Testing

Developers access the assigned runtime URLs.

They execute test cases and submit approval or rejection.

Rejection must include a reason.

A rejection returns the migration to DevOps remediation.

### Stage 12: Production Approval

After developer approval, the DevOps Engineer submits a production cutover request.

The DevOps Lead reviews:

- Compatibility assessment.
- Backup verification.
- Target gateway health.
- Developer test results.
- Cutover plan.
- Rollback plan.
- Monitoring readiness.

### Stage 13: Production Cutover

After approval, the DevOps Engineer executes the cutover.

The traffic switching mechanism must be selected according to the actual environment.

Preferred approach:

- External load balancer or traffic manager switching.

Alternative approach:

- DNS switching, where supported and explicitly approved.

KMM must not assume that changing Kubernetes Ingress resources alone changes production traffic.

### Stage 14: Post-Cutover Monitoring

KMM monitors:

- Application availability.
- HTTP error rates.
- Latency.
- Gateway health.
- Backend health.
- Pod readiness.
- Traffic routing.
- Relevant application and gateway logs.

### Stage 15: Stabilization and Closure

NGINX remains available during the configured stabilization period.

After successful stabilization, the migration can be closed.

NGINX decommissioning requires a separate approval and change process.

## 7. Migration State Machine

| State                        | Description                          |
| ---------------------------- | ------------------------------------ |
| Draft                        | Migration created                    |
| Discovering                  | Live cluster discovery running       |
| Assessment                   | Compatibility assessment running     |
| Blocked                      | Issues require remediation           |
| Ready for Backup             | Assessment passed                    |
| Backing Up                   | Backup in progress                   |
| Backup Verification          | Backup integrity checking            |
| Ready to Deploy              | Backup verified                      |
| Deploying Target             | Target controller deployment running |
| Configuring Routes           | Target configuration applying        |
| Validating Target            | Infrastructure validation            |
| Runtime Testing              | Runtime URLs ready                   |
| Developer Rejected           | Developer validation rejected        |
| Developer Approved           | Application validation approved      |
| Awaiting Production Approval | Cutover request submitted            |
| Production Rejected          | Cutover rejected                     |
| Approved for Cutover         | Approval completed                   |
| Cutting Over                 | Production traffic switching         |
| Post-Cutover Validation      | Production verification              |
| Stabilizing                  | Health monitoring period             |
| Rollback in Progress         | Traffic restoration underway         |
| Rolled Back                  | Source traffic restored              |
| Completed                    | Migration closed successfully        |
| Failed                       | Migration failed                     |
| Cancelled                    | Migration cancelled                  |

All state transitions must be persisted.

Each transition must record actor, timestamp, previous state, new state, reason and workflow reference.

## 8. Functional Requirements

### 8.1 Authentication and RBAC

- FR-001: Support enterprise OIDC authentication.
- FR-002: Support enterprise SSO.
- FR-003: Implement role-based access control.
- FR-004: Support cluster, namespace and application-level permissions.
- FR-005: Record authentication events.
- FR-006: Prevent developers from modifying Kubernetes infrastructure.
- FR-007: Enforce server-side authorization.
- FR-008: Support separation of duties for cutover approval.
- FR-009: Support emergency access with justification.
- FR-010: Never expose Kubernetes credentials in browser storage.

### 8.2 Cluster Discovery

- FR-011: Register Kubernetes clusters.
- FR-012: Validate API connectivity.
- FR-013: Display cluster version and identity.
- FR-014: Discover namespaces.
- FR-015: Discover workloads and services.
- FR-016: Discover Ingress and IngressClass resources.
- FR-017: Discover NGINX controller installations.
- FR-018: Discover Gateway API CRDs.
- FR-019: Discover target controller installations.
- FR-020: Record discovery timestamps.
- FR-021: Support manual rediscovery.
- FR-022: Identify incomplete discovery due to permissions.
- FR-023: Store discovery snapshots.
- FR-024: Detect source configuration drift.

### 8.3 NGINX Assessment

- FR-025: Discover NGINX routing rules.
- FR-026: Discover annotations and rewrite rules.
- FR-027: Discover TLS references.
- FR-028: Discover authentication policies.
- FR-029: Discover rate limiting.
- FR-030: Discover CORS and header configuration.
- FR-031: Discover timeouts and body-size restrictions.
- FR-032: Discover custom snippets.
- FR-033: Identify unsupported features.
- FR-034: Generate compatibility reports.
- FR-035: Support manual remediation.
- FR-036: Preserve source configuration.
- FR-037: Detect configuration changes before cutover.

### 8.4 Gateway Controller Support

- FR-038: Support Traefik.
- FR-039: Support Envoy Gateway.
- FR-040: Support Istio Gateway.
- FR-041: Detect controller versions.
- FR-042: Validate controller CRDs.
- FR-043: Support Kubernetes Gateway API where available.
- FR-044: Provide controller-specific adapters.
- FR-045: Display controller capability matrix.
- FR-046: Detect unsupported features.
- FR-047: Generate controller-specific resources.
- FR-048: Validate resources before applying.
- FR-049: Version generated configurations.
- FR-050: Compare target configuration with existing resources.
- FR-051: Prevent unintended overwrites.
- FR-052: Audit custom configuration overrides.

#### Traefik

- FR-053: Deploy and validate Traefik.
- FR-054: Support applicable Gateway API resources.
- FR-055: Support IngressRoute, Middleware and TraefikService where applicable.
- FR-056: Validate entry points and TLS.

#### Envoy Gateway

- FR-057: Deploy and validate Envoy Gateway.
- FR-058: Validate GatewayClass and Gateway status.
- FR-059: Validate HTTPRoute and backend references.
- FR-060: Support applicable EnvoyProxy and SecurityPolicy resources.
- FR-061: Validate supported extensions.

#### Istio Gateway

- FR-062: Deploy and validate Istio Gateway.
- FR-063: Support Gateway API where supported.
- FR-064: Support Istio-specific Gateway and VirtualService resources.
- FR-065: Support relevant AuthorizationPolicy and DestinationRule configurations when in scope.
- FR-066: Separate gateway-only migration from service-mesh migration.
- FR-067: Never enable mesh features without explicit approval.

### 8.5 Backup and Recovery

- FR-068: Create backups before production-impacting operations.
- FR-069: Back up source routing resources.
- FR-070: Back up referenced configuration and TLS material securely.
- FR-071: Back up Helm metadata and controller configuration.
- FR-072: Back up relevant target resources.
- FR-073: Capture traffic-management configuration where accessible.
- FR-074: Store backup manifests.
- FR-075: Encrypt backups.
- FR-076: Generate checksums.
- FR-077: Verify backup completeness.
- FR-078: Support restore validation.
- FR-079: Block cutover if backup verification fails.
- FR-080: Support manual and automated restore.
- FR-081: Audit all backup operations.
- FR-082: Enforce retention policies.
- FR-083: Redact sensitive values from logs.

### 8.6 Deployment and Configuration

- FR-084: Deploy controllers through approved Helm or installation methods.
- FR-085: Pin controller versions.
- FR-086: Show planned resource changes.
- FR-087: Validate CRDs before applying resources.
- FR-088: Apply resources in dependency order.
- FR-089: Track every Kubernetes operation.
- FR-090: Verify controller readiness.
- FR-091: Verify route acceptance and programming.
- FR-092: Verify TLS.
- FR-093: Detect deployment failures.
- FR-094: Stop on critical validation failure.
- FR-095: Support workflow resumption.
- FR-096: Support idempotent operations.
- FR-097: Associate deployed resources with migration identity.

### 8.7 Runtime URLs

- FR-098: Generate temporary runtime hostnames.
- FR-099: Integrate with configured DNS providers.
- FR-100: Validate DNS resolution.
- FR-101: Provision or associate TLS certificates.
- FR-102: Validate TLS handshakes.
- FR-103: Validate routing.
- FR-104: Support protected runtime URLs.
- FR-105: Assign runtime URLs to developers.
- FR-106: Provide test instructions.
- FR-107: Track URL expiry and revocation.
- FR-108: Clearly distinguish runtime and production URLs.
- FR-109: Allow authorized URL revocation.
- FR-110: Track URL validation results.

### 8.8 Developer Validation

- FR-111: Notify developers about assignments.
- FR-112: Display assigned runtime URLs.
- FR-113: Support test case execution records.
- FR-114: Support permitted evidence attachments.
- FR-115: Support developer approval and rejection.
- FR-116: Require rejection reasons.
- FR-117: Record developer identity and approval time.
- FR-118: Notify DevOps of test results.
- FR-119: Invalidate approval after material configuration changes.
- FR-120: Block cutover until required approvals are completed.

### 8.9 Production Approval and Cutover

- FR-121: Submit cutover requests.
- FR-122: Attach cutover and rollback plans.
- FR-123: Require authorized DevOps Lead approval.
- FR-124: Record approval and rejection.
- FR-125: Revalidate approval when material configuration changes.
- FR-126: Run pre-cutover readiness checks.
- FR-127: Display expected traffic switching behavior.
- FR-128: Support external load balancer switching.
- FR-129: Support approved DNS switching.
- FR-130: Verify actual traffic path.
- FR-131: Verify production application health.
- FR-132: Monitor cutover.
- FR-133: Retain NGINX during stabilization.
- FR-134: Require separate approval for NGINX decommissioning.

### 8.10 Monitoring and Rollback

- FR-135: Monitor gateway health.
- FR-136: Monitor application availability.
- FR-137: Monitor error rates and latency.
- FR-138: Monitor backend health.
- FR-139: Integrate with Prometheus.
- FR-140: Integrate with logging systems.
- FR-141: Configure stabilization windows.
- FR-142: Generate threshold alerts.
- FR-143: Support manual rollback.
- FR-144: Support policy-based automated rollback.
- FR-145: Restore previous traffic configuration.
- FR-146: Verify NGINX receives production traffic.
- FR-147: Verify application health after rollback.
- FR-148: Record rollback details.
- FR-149: Preserve failure evidence.
- FR-150: Declare rollback successful only after verification.

### 8.11 Audit and Reporting

- FR-151: Maintain migration history.
- FR-152: Maintain complete event history.
- FR-153: Record user and system actions.
- FR-154: Preserve before-and-after configuration references.
- FR-155: Record infrastructure operation results.
- FR-156: Record approvals and rejections.
- FR-157: Record notification delivery status.
- FR-158: Record monitoring alerts.
- FR-159: Record backup and rollback evidence.
- FR-160: Support searchable audit history.
- FR-161: Export migration reports.
- FR-162: Configure retention.
- FR-163: Protect audit history from ordinary user modification.
- FR-164: Correlate requests and workflow executions.
- FR-165: Display data freshness.

### 8.12 Real-Time Tracking

- FR-166: Provide a real-time activity timeline.
- FR-167: Display operation states.
- FR-168: Record operation start and completion times.
- FR-169: Record responsible actor.
- FR-170: Display progress from persisted workflow events.
- FR-171: Stream logs and events.
- FR-172: Link events to Kubernetes resources.
- FR-173: Show integration synchronization timestamps.
- FR-174: Detect stale or unavailable data.
- FR-175: Track retry counts and retry reasons.
- FR-176: Display redacted operation errors.
- FR-177: Support safe pause, resume and cancellation.
- FR-178: Audit pause, resume and cancellation.
- FR-179: Assign unique event identifiers and sequence numbers.
- FR-180: Reconcile frontend state with backend state.
- FR-181: Never mark an operation successful just because a request was submitted.
- FR-182: Detect external resource changes.
- FR-183: Notify DevOps about migration-impacting drift.
- FR-184: Distinguish live, cached and unavailable data.
- FR-185: Preserve activity history across service restarts.

## 9. Real-Time Dashboard

The dashboard must show live information from actual integrations.

Required widgets:

- Active migrations.
- Migrations awaiting developer approval.
- Migrations awaiting production approval.
- Failed migrations.
- Rolled-back migrations.
- Connected Kubernetes clusters.
- Gateway health.
- Integration health.
- Recent activity.
- Operational alerts.
- Migration history and duration.

Every widget must be API-backed.

If an integration is unavailable, display its actual connection status instead of substituting mock values.

## 10. Required UI Screens

1. Login.
2. Dashboard.
3. Cluster Management.
4. Cluster Explorer.
5. Migration Creation.
6. NGINX Assessment.
7. Configuration Review.
8. Backup Center.
9. Deployment Center.
10. Runtime Testing.
11. Developer Portal.
12. Production Approval Center.
13. Cutover Console.
14. Monitoring Dashboard.
15. Rollback Console.
16. Migration Details.
17. Audit Explorer.
18. Integration Management.
19. User and Role Management.
20. Platform Settings.

### Migration Details Page

Every migration must have a centralized detail page containing:

- Migration ID.
- Application.
- Cluster and namespace.
- DevOps owner.
- Source controller.
- Target controller.
- Current workflow state.
- Compatibility report.
- Backup status.
- Configuration version.
- Deployment status.
- Runtime URLs.
- Developer assignments.
- Developer approvals.
- Production approval.
- Cutover history.
- Live monitoring.
- Rollback information.
- Activity timeline.
- Evidence and reports.

## 11. Audit and Event Tracking

Every user and system operation must be recorded.

### Mandatory event fields

| Field              | Description                         |
| ------------------ | ----------------------------------- |
| event_id           | Unique event ID                     |
| sequence_number    | Event ordering                      |
| occurred_at        | UTC timestamp                       |
| actor_type         | User, service or system             |
| actor_id           | Authenticated identity              |
| action             | Operation performed                 |
| outcome            | Success, failure, denied or pending |
| migration_id       | Related migration                   |
| cluster_id         | Related cluster                     |
| namespace          | Related namespace                   |
| resource_kind      | Resource type                       |
| resource_name      | Resource name                       |
| request_id         | Request correlation ID              |
| workflow_id        | Workflow execution ID               |
| reason             | Operation reason                    |
| error_code         | Structured error                    |
| error_summary      | Redacted error details              |
| source_system      | Originating integration             |
| evidence_reference | Evidence location                   |

Audit events must be append-only for ordinary application users.

Corrections must be recorded as new events rather than silently modifying historical records.

### Events to track

- Authentication and authorization.
- Cluster registration and discovery.
- Assessment execution and remediation.
- Configuration generation and changes.
- Backup and verification.
- Deployment and configuration application.
- Runtime URL creation and validation.
- Developer test execution and approvals.
- Production approval.
- Cutover.
- Monitoring alerts.
- Rollback.
- Workflow retry, pause, resume and cancellation.
- Notification delivery.
- Integration changes.
- Administrative changes.

## 12. Technical Architecture

### Recommended Technology Stack

| Layer                  | Technology                          |
| ---------------------- | ----------------------------------- |
| Frontend               | React and TypeScript                |
| UI                     | Material UI                         |
| Backend                | Python FastAPI                      |
| Workflow               | Temporal                            |
| Database               | PostgreSQL                          |
| Event streaming        | WebSocket or SSE                    |
| Cache                  | Redis                               |
| Kubernetes integration | Kubernetes Python Client            |
| Deployment             | Helm                                |
| Object storage         | Encrypted S3-compatible storage     |
| Authentication         | OIDC / Keycloak                     |
| Metrics                | Prometheus                          |
| Visualization          | Grafana integration                 |
| Logging                | Loki or enterprise logging platform |
| Tracing                | OpenTelemetry                       |
| Secrets                | External secrets manager            |

### Architecture Components

1. Frontend application.
2. API and authorization service.
3. Durable workflow engine.
4. Kubernetes integration workers.
5. Gateway controller adapters.
6. DNS integration.
7. Load balancer or traffic-manager integration.
8. Monitoring integration.
9. Notification service.
10. PostgreSQL.
11. Encrypted object storage.
12. Append-only audit storage.

### Controller Adapter Interface

Every adapter must implement:

- discover_capabilities
- detect_installation
- validate_version
- validate_crds
- convert_source_configuration
- generate_target_resources
- validate_generated_resources
- deploy_controller
- apply_target_configuration
- validate_gateway_status
- validate_route_status
- validate_tls
- generate_runtime_endpoint
- collect_health
- backup_target_configuration
- restore_target_configuration
- remove_target_resources

The adapter must return structured results and evidence. Kubernetes API acceptance alone must not be treated as proof of successful deployment.

## 13. Database Design

Required entities:

- users
- roles
- permissions
- user_role_assignments
- clusters
- cluster_credentials
- namespaces
- applications
- discovered_resources
- discovery_snapshots
- migrations
- migration_versions
- assessments
- assessment_findings
- configuration_artifacts
- controller_installations
- backups
- backup_contents
- workflow_executions
- workflow_steps
- runtime_endpoints
- test_assignments
- test_results
- approvals
- cutover_plans
- cutover_executions
- monitoring_snapshots
- alerts
- rollback_executions
- integration_connections
- notifications
- audit_events
- evidence_artifacts
- idempotency_records

Database rules:

1. Every migration has a unique immutable ID.
2. Every migration has an assigned DevOps owner.
3. Configuration changes create new versions.
4. Approvals reference exact configuration versions.
5. Workflow steps persist their execution status.
6. Backups reference source discovery snapshots.
7. Cutovers reference approved cutover plans.
8. Rollbacks reference their associated cutover.
9. Evidence artifacts have checksums.
10. All timestamps use UTC.
11. Audit events cannot be silently deleted.
12. Credentials are stored through protected external references.

## 14. API Requirements

Proposed REST API endpoints:

| Endpoint                                        | Function                      |
| ----------------------------------------------- | ----------------------------- |
| GET /api/v1/clusters                            | List clusters                 |
| POST /api/v1/clusters                           | Register cluster              |
| POST /api/v1/clusters/{id}/test-connection      | Validate connectivity         |
| POST /api/v1/clusters/{id}/discover             | Start discovery               |
| GET /api/v1/clusters/{id}/resources             | Retrieve discovered resources |
| POST /api/v1/migrations                         | Create migration              |
| GET /api/v1/migrations                          | List migrations               |
| GET /api/v1/migrations/{id}                     | Retrieve migration            |
| POST /api/v1/migrations/{id}/assess             | Run assessment                |
| POST /api/v1/migrations/{id}/backups            | Create backup                 |
| POST /api/v1/migrations/{id}/deploy             | Deploy target                 |
| GET /api/v1/migrations/{id}/runtime-endpoints   | Retrieve runtime URLs         |
| POST /api/v1/migrations/{id}/test-assignments   | Assign developers             |
| POST /api/v1/migrations/{id}/test-results       | Submit tests                  |
| POST /api/v1/migrations/{id}/developer-approval | Developer approval            |
| POST /api/v1/migrations/{id}/cutover-requests   | Request cutover               |
| POST /api/v1/cutover-requests/{id}/approve      | Approve cutover               |
| POST /api/v1/cutover-requests/{id}/reject       | Reject cutover                |
| POST /api/v1/migrations/{id}/cutover            | Execute cutover               |
| POST /api/v1/migrations/{id}/rollback           | Execute rollback              |
| GET /api/v1/migrations/{id}/events              | Retrieve events               |
| GET /api/v1/migrations/{id}/logs                | Retrieve logs                 |
| GET /api/v1/audit-events                        | Search audit records          |
| GET /api/v1/integrations                        | Integration health            |

Long-running operations must return workflow references. Their actual execution status must be retrieved from the durable workflow state.

All write operations must enforce server-side authorization, validation, idempotency and audit logging.

## 15. External Integrations

Required integration capabilities:

- Kubernetes API.
- Helm.
- DNS provider.
- External load balancer or traffic manager.
- Certificate manager.
- Prometheus.
- Logging platform.
- OIDC identity provider.
- Secrets manager.
- Email or messaging provider.
- Encrypted object storage.

Each integration must display:

- Configuration status.
- Connection status.
- Last successful check.
- Last failure.
- Available capabilities.
- Permission errors.
- Credential expiry where applicable.

Missing integrations must be displayed as unavailable, not successful.

## 16. Security Requirements

- TLS for all communications.
- Least-privilege Kubernetes RBAC.
- Short-lived credentials where supported.
- External secrets management.
- Encryption of backups.
- Server-side authorization.
- Secret redaction in logs.
- Audit access controls.
- Runtime URL protection.
- Explicit authorization for destructive operations.
- Protection against CSRF, XSS and injection.
- Credential rotation and revocation.
- Restricted evidence uploads.
- Separate identities for users and automation workers.

## 17. Non-Functional Requirements

| ID      | Requirement           | Target                                                       |
| ------- | --------------------- | ------------------------------------------------------------ |
| NFR-001 | API availability      | 99.9% monthly objective                                      |
| NFR-002 | Standard API response | P95 under 2 seconds for metadata queries                     |
| NFR-003 | Dashboard freshness   | New workflow events within 5 seconds under normal conditions |
| NFR-004 | Event durability      | No acknowledged event silently discarded                     |
| NFR-005 | Workflow recovery     | Resume supported workflows after service restarts            |
| NFR-006 | Scalability           | Multiple clusters and concurrent migrations                  |
| NFR-007 | Auditability          | All privileged actions traceable                             |
| NFR-008 | Observability         | Logs, metrics and traces                                     |
| NFR-009 | Time consistency      | UTC storage                                                  |
| NFR-010 | Data integrity        | Backup checksums and verification                            |
| NFR-011 | Disaster recovery     | Documented KMM backup and recovery                           |
| NFR-012 | Accessibility         | Keyboard-accessible workflows                                |

These are initial engineering targets subject to load testing and capacity planning.

## 18. Zero-Downtime Migration Strategy

KMM must aim for zero planned application downtime.

The recommended approach:

1. Keep NGINX serving production traffic.
2. Deploy the target gateway in parallel.
3. Generate target routing resources.
4. Generate temporary runtime URLs.
5. Validate application functionality.
6. Obtain developer approval.
7. Obtain production approval.
8. Switch traffic through the configured traffic-management layer.
9. Verify target traffic and application health.
10. Keep NGINX available throughout stabilization.
11. Decommission NGINX through a separate approved change.

The platform must not guarantee uninterrupted existing connections in every environment. Actual behavior depends on application compatibility, connection draining, load balancer behavior, DNS caching and network configuration.

## 19. Rollback Requirements

Rollback must:

1. Identify the rollback trigger.
2. Stop further cutover changes.
3. Retrieve verified pre-cutover configuration.
4. Restore the production traffic path to NGINX.
5. Verify production traffic reaches NGINX.
6. Verify application health.
7. Preserve diagnostic evidence.
8. Notify DevOps and DevOps Lead.
9. Record rollback completion only after recovery verification.

Restoring YAML alone does not qualify as successful rollback.

## 20. Acceptance Criteria

- AC-001: KMM connects to real Kubernetes clusters.
- AC-002: KMM discovers actual Kubernetes resources.
- AC-003: Discovery errors are visible.
- AC-004: Compatibility assessment identifies unsupported configuration.
- AC-005: Traefik, Envoy Gateway and Istio Gateway are supported.
- AC-006: Controller versions and CRDs are detected.
- AC-007: Backups are generated and verified.
- AC-008: Target gateways are actually deployed.
- AC-009: Routes are accepted and programmed.
- AC-010: Runtime URLs pass DNS and TLS validation.
- AC-011: Developers can test without infrastructure write permissions.
- AC-012: Developer rejection blocks production cutover.
- AC-013: Developer approval is version-specific.
- AC-014: Production cutover requires authorization.
- AC-015: Cutover readiness is revalidated before execution.
- AC-016: Production traffic is verified after cutover.
- AC-017: Rollback restores and verifies the NGINX traffic path.
- AC-018: NGINX remains available throughout stabilization.
- AC-019: Every action creates a persisted audit event.
- AC-020: Activity history survives application restarts.
- AC-021: Dashboard updates from actual events.
- AC-022: Disconnected integrations are displayed accurately.
- AC-023: Operations are correlated with migration and workflow IDs.
- AC-024: Ordinary users cannot modify audit history.
- AC-025: Backup and evidence artifacts have integrity references.
- AC-026: Material changes invalidate approvals.
- AC-027: External resource drift is detected.
- AC-028: Failed operations display actual redacted errors.
- AC-029: Supported interrupted workflows can resume.
- AC-030: Production functionality contains no mock infrastructure data.

## 21. Testing Strategy

Testing must include:

- Unit testing.
- Kubernetes integration testing.
- Helm integration testing.
- Gateway adapter contract testing.
- Workflow recovery testing.
- End-to-end migration testing.
- RBAC and security testing.
- Failure injection.
- Backup and restore testing.
- Traffic cutover testing.
- Rollback testing.
- Event-stream reconnection testing.
- Performance and load testing.
- Controller version compatibility testing.

Mandatory failure scenarios include Kubernetes API disconnection, insufficient permissions, missing CRDs, unsupported annotations, gateway deployment failure, invalid TLS, DNS failure, developer rejection, approval rejection, backup corruption, load balancer failure, post-cutover health deterioration, worker restart and rollback failure.

Every test must produce a persisted result and evidence reference.

## 22. Implementation Roadmap

| Phase    | Deliverables                                                         | Priority     |
| -------- | -------------------------------------------------------------------- | ------------ |
| Phase 1  | Authentication, RBAC, cluster registration and discovery             | P0           |
| Phase 2  | NGINX inventory and compatibility assessment                         | P0           |
| Phase 3  | PostgreSQL data model, Temporal workflows, event tracking and backup | P0           |
| Phase 4  | Gateway API common model and Traefik adapter                         | P0           |
| Phase 5  | Runtime URL and developer validation                                 | P0           |
| Phase 6  | Approval, production cutover, monitoring and rollback                | P0           |
| Phase 7  | Envoy Gateway adapter                                                | P1           |
| Phase 8  | Istio Gateway adapter                                                | P1           |
| Phase 9  | Advanced reporting and analytics                                     | P2           |
| Phase 10 | Optional full service-mesh migration                                 | Future scope |

## 23. Definition of Done

The implementation is complete when:

1. DevOps can create a migration against a real Kubernetes cluster.
2. KMM discovers actual NGINX configuration.
3. KMM assesses and converts source configuration.
4. A verified backup is available.
5. The target gateway is deployed and healthy.
6. Runtime URLs work through the target gateway.
7. Developers can submit real test results and approvals.
8. DevOps Lead can authorize production cutover.
9. DevOps can execute approved cutover.
10. KMM verifies production traffic and application health.
11. KMM can restore and verify the NGINX traffic path.
12. All actions are persisted and searchable.
13. Dashboard data comes from actual integrations.
14. No production functionality depends on mock data.
15. Security and failure recovery tests pass.
16. Operational documentation and runbooks are delivered.

## 24. Mandatory Engineering Rules

1. Never use mock production data.
2. Never simulate successful infrastructure operations.
3. Never treat API acceptance as proof of infrastructure readiness.
4. Never allow unapproved production cutover.
5. Never proceed without mandatory verified backup.
6. Never apply untracked configuration changes.
7. Never remove NGINX automatically after cutover.
8. Never claim zero downtime without qualifying the infrastructure conditions.
9. Never lose event history after service restart.
10. Never hide unavailable integrations or unsupported controller features.

## 25. Final Product Definition

Kubernetes Migration Manager is a real-time, auditable Kubernetes traffic migration orchestration platform.

The DevOps Engineer owns and executes the migration. Developers validate application behavior through runtime URLs. The DevOps Lead authorizes production cutover.

The system must connect to real infrastructure, perform actual migration operations, verify every critical action and maintain a complete record of everything that happens.

**First delivery milestone:** Complete one real non-production NGINX-to-target migration, including discovery, compatibility assessment, backup, target deployment, runtime testing, developer approval, production approval, traffic switching, rollback and full audit history.

A visually complete dashboard without working infrastructure integrations does not qualify as an MVP.

Implementation baseline: Build the real integration, workflow, database and audit foundations first. Connect every dashboard screen to these live services rather than developing a static UI and adding infrastructure integrations later.
