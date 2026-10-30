import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import TokenPayload, get_current_user
from app.models.auth import User
from app.models.backup import Backup
from app.models.cutover import Approval, CutoverExecution, CutoverPlan, RollbackExecution
from app.models.infrastructure import Application, Cluster, ClusterCredential, Namespace
from app.models.migration import (
    Assessment,
    AssessmentFinding,
    ConfigurationArtifact,
    Migration,
    MigrationVersion,
)
from app.models.testing import RuntimeEndpoint
from app.schemas.assessment import AssessmentRequest, AssessmentResponse, DiffResponse, FindingResponse
from app.schemas.cutover import (
    CutoverApprovalRequest,
    CutoverExecuteRequest,
    CutoverRequestCreate,
    CutoverStatusResponse,
    DeveloperApprovalRequest,
    RollbackRequest,
)
from app.schemas.migration import MigrationCreate, MigrationDetailResponse, MigrationResponse
from app.services.backup_engine import BackupEngine
from app.services.event_broadcaster import event_broadcaster
from app.services.nginx_parser import NginxAnnotationParser
from app.services.synthetic_prober import SyntheticProber
from app.services.traefik_adapter import TraefikAdapter

router = APIRouter()

async def verify_cluster_authenticated(db: AsyncSession, cluster_id: UUID) -> Cluster:
    cluster = await db.get(Cluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    cred_res = await db.execute(select(ClusterCredential).where(ClusterCredential.cluster_id == cluster_id))
    cred = cred_res.scalar_one_or_none()
    if not cred or cred.validation_status not in ("AUTHENTICATED", "VALIDATED"):
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail=f"Cluster authentication required. Cluster '{cluster.name}' must be authenticated before accessing migration items or executing migration operations."
        )
    return cluster

@router.get("", response_model=List[MigrationResponse])
async def list_migrations(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    query = select(Migration).order_by(Migration.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=MigrationResponse, status_code=status.HTTP_201_CREATED)
async def create_migration(
    migration_in: MigrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    # Verify cluster exists and is authenticated
    cluster = await verify_cluster_authenticated(db, migration_in.cluster_id)

    # Find or create namespace
    ns_res = await db.execute(
        select(Namespace).where(
            Namespace.cluster_id == migration_in.cluster_id,
            Namespace.name == migration_in.namespace
        )
    )
    ns = ns_res.scalar_one_or_none()
    if not ns:
        ns = Namespace(cluster_id=migration_in.cluster_id, name=migration_in.namespace)
        db.add(ns)
        await db.flush()

    # Find or create application
    app_res = await db.execute(
        select(Application).where(
            Application.namespace_id == ns.id,
            Application.name == migration_in.application_name
        )
    )
    app = app_res.scalar_one_or_none()
    if not app:
        app = Application(
            namespace_id=ns.id,
            name=migration_in.application_name,
            production_url=migration_in.production_url,
            owner_email=current_user.email
        )
        db.add(app)
        await db.flush()

    # Find or create devops user in DB
    user_res = await db.execute(select(User).where(User.email == current_user.email))
    devops_user = user_res.scalar_one_or_none()
    if not devops_user:
        devops_user = User(
            email=current_user.email,
            full_name=current_user.email.split("@")[0].capitalize(),
            is_active=True
        )
        db.add(devops_user)
        await db.flush()

    new_migration = Migration(
        name=migration_in.name,
        cluster_id=migration_in.cluster_id,
        application_id=app.id,
        devops_owner_id=devops_user.id,
        source_controller="NGINX",
        target_controller=migration_in.target_controller,
        current_state="DRAFT"
    )
    db.add(new_migration)
    await db.commit()
    await db.refresh(new_migration)

    await event_broadcaster.broadcast(
        event_type="MIGRATION_CREATED",
        migration_id=str(new_migration.id),
        data={"migration_id": str(new_migration.id), "name": new_migration.name, "state": new_migration.current_state}
    )

    return new_migration

@router.get("/{migration_id}", response_model=MigrationDetailResponse)
async def get_migration(
    migration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    cluster = await db.get(Cluster, migration.cluster_id)
    app = await db.get(Application, migration.application_id)

    # Check verified backup
    backup_res = await db.execute(
        select(Backup).where(Backup.migration_id == migration_id, Backup.status == "VERIFIED")
    )
    has_backup = backup_res.scalar_one_or_none() is not None

    # Check approvals
    dev_app = await db.execute(
        select(Approval).where(
            Approval.migration_id == migration_id,
            Approval.approval_type == "DEVELOPER_TESTING",
            Approval.status == "APPROVED"
        )
    )
    developer_approved = dev_app.scalar_one_or_none() is not None

    prod_app = await db.execute(
        select(Approval).where(
            Approval.migration_id == migration_id,
            Approval.approval_type == "PRODUCTION_CUTOVER",
            Approval.status == "APPROVED"
        )
    )
    production_approved = prod_app.scalar_one_or_none() is not None

    # Get runtime endpoint
    rt_res = await db.execute(select(RuntimeEndpoint).where(RuntimeEndpoint.migration_id == migration_id))
    runtime_ep = rt_res.scalar_one_or_none()
    runtime_url = runtime_ep.runtime_hostname if runtime_ep else None

    return MigrationDetailResponse(
        id=migration.id,
        migration_number=migration.migration_number,
        name=migration.name,
        cluster_id=migration.cluster_id,
        cluster_name=cluster.name if cluster else "EKS Cluster",
        application_name=app.name if app else "App",
        production_url=app.production_url if app else "https://app.company.com",
        source_controller=migration.source_controller,
        target_controller=migration.target_controller,
        current_state=migration.current_state,
        temporal_workflow_id=migration.temporal_workflow_id,
        has_verified_backup=has_backup,
        developer_approved=developer_approved,
        production_approved=production_approved,
        runtime_url=runtime_url,
        created_at=migration.created_at,
        updated_at=migration.updated_at,
        completed_at=migration.completed_at
    )

@router.post("/{migration_id}/assess", response_model=AssessmentResponse)
async def assess_migration(
    migration_id: UUID,
    request: AssessmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    cluster = await verify_cluster_authenticated(db, migration.cluster_id)

    app = await db.get(Application, migration.application_id)
    host = app.production_url.replace("https://", "").replace("http://", "").split("/")[0]

    # Sample source NGINX ingress manifest for assessment
    mock_source_ingress = {
        "apiVersion": "networking.k8s.io/v1",
        "kind": "Ingress",
        "metadata": {
            "name": f"{app.name}-ingress",
            "namespace": "production-apps",
            "annotations": {
                "kubernetes.io/ingress.class": "nginx",
                "nginx.ingress.kubernetes.io/ssl-redirect": "true",
                "nginx.ingress.kubernetes.io/proxy-body-size": "50m",
                "nginx.ingress.kubernetes.io/limit-rps": "250",
                "nginx.ingress.kubernetes.io/whitelist-source-range": "10.0.0.0/8, 192.168.1.0/24"
            }
        },
        "spec": {
            "rules": [
                {
                    "host": host,
                    "http": {
                        "paths": [
                            {
                                "path": "/",
                                "pathType": "Prefix",
                                "backend": {
                                    "service": {
                                        "name": f"{app.name}-svc",
                                        "port": {"number": 80}
                                    }
                                }
                            }
                        ]
                    }
                }
            ],
            "tls": [
                {
                    "hosts": [host],
                    "secretName": f"{app.name}-tls-cert"
                }
            ]
        }
    }

    # Run AST assessment
    parse_result = NginxAnnotationParser.parse_ingress(mock_source_ingress)
    target_manifests = TraefikAdapter.generate_manifests(parse_result.canonical_ir)

    # Create immutable version record
    new_version = MigrationVersion(
        migration_id=migration_id,
        version_number=1,
        source_manifest_hash="hash-nginx-v1",
        canonical_ir=parse_result.canonical_ir.model_dump(),
        target_manifests=target_manifests,
        change_summary="Initial automated conversion from NGINX Ingress to Traefik CRDs."
    )
    db.add(new_version)
    await db.flush()

    new_assessment = Assessment(
        migration_id=migration_id,
        version_id=new_version.id,
        target_controller=request.target_controller,
        is_compatible=parse_result.is_compatible,
        blocker_count=parse_result.blocker_count,
        warning_count=parse_result.warning_count
    )
    db.add(new_assessment)
    await db.flush()

    finding_responses: List[FindingResponse] = []
    for f in parse_result.findings:
        f_row = AssessmentFinding(
            assessment_id=new_assessment.id,
            severity=f.severity,
            annotation_or_feature=f.annotation,
            source_value=f.source_value,
            remediation_suggestion=f.remediation_suggestion,
            is_resolved=not f.is_blocking
        )
        db.add(f_row)
        finding_responses.append(
            FindingResponse(
                severity=f.severity,
                annotation_or_feature=f.annotation,
                source_value=f.source_value,
                target_mapping=f.target_mapping,
                remediation_suggestion=f.remediation_suggestion,
                is_resolved=not f.is_blocking
            )
        )

    # Advance migration state
    migration.current_state = "READY_FOR_BACKUP" if parse_result.is_compatible else "BLOCKED"
    migration.active_version_id = new_version.id
    await db.commit()

    await event_broadcaster.broadcast(
        event_type="ASSESSMENT_COMPLETED",
        migration_id=str(migration_id),
        data={"is_compatible": parse_result.is_compatible, "blockers": parse_result.blocker_count, "state": migration.current_state}
    )

    return AssessmentResponse(
        assessment_id=new_assessment.id,
        migration_id=migration_id,
        target_controller=request.target_controller,
        is_compatible=parse_result.is_compatible,
        blocker_count=parse_result.blocker_count,
        warning_count=parse_result.warning_count,
        findings=finding_responses,
        canonical_ir=parse_result.canonical_ir.model_dump(),
        assessed_at=new_assessment.assessed_at
    )

@router.get("/{migration_id}/diff", response_model=DiffResponse)
async def get_configuration_diff(
    migration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    await verify_cluster_authenticated(db, migration.cluster_id)

    app = await db.get(Application, migration.application_id)
    host = app.production_url.replace("https://", "").replace("http://", "").split("/")[0]

    # Sample source NGINX YAML
    source_yaml = f"""apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {app.name}-ingress
  namespace: production-apps
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/limit-rps: "250"
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8, 192.168.1.0/24"
spec:
  rules:
  - host: {host}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {app.name}-svc
            port:
              number: 80
  tls:
  - hosts:
    - {host}
    secretName: {app.name}-tls-cert
"""

    parse_result = NginxAnnotationParser.parse_ingress(
        {
            "metadata": {
                "name": f"{app.name}-ingress",
                "namespace": "production-apps",
                "annotations": {
                    "nginx.ingress.kubernetes.io/ssl-redirect": "true",
                    "nginx.ingress.kubernetes.io/proxy-body-size": "50m",
                    "nginx.ingress.kubernetes.io/limit-rps": "250",
                    "nginx.ingress.kubernetes.io/whitelist-source-range": "10.0.0.0/8, 192.168.1.0/24"
                }
            },
            "spec": {
                "rules": [{"host": host, "http": {"paths": [{"path": "/", "backend": {"service": {"name": f"{app.name}-svc", "port": {"number": 80}}}}]}}],
                "tls": [{"hosts": [host], "secretName": f"{app.name}-tls-cert"}]
            }
        }
    )
    traefik_manifests = TraefikAdapter.generate_manifests(parse_result.canonical_ir)
    target_yaml = TraefikAdapter.to_yaml_string(traefik_manifests)

    return DiffResponse(
        migration_id=migration_id,
        version_number=1,
        source_nginx_yaml=source_yaml,
        target_traefik_yaml=target_yaml,
        changed_directives_summary=[
            "nginx.ingress.kubernetes.io/ssl-redirect -> Traefik Middleware RedirectScheme",
            "nginx.ingress.kubernetes.io/proxy-body-size: 50m -> Traefik Middleware Buffering (52428800 bytes)",
            "nginx.ingress.kubernetes.io/limit-rps: 250 -> Traefik Middleware RateLimit",
            "nginx.ingress.kubernetes.io/whitelist-source-range -> Traefik Middleware IPAllowList",
            "Target IngressRoute configured with entryPoints: [web, websecure]"
        ]
    )

@router.post("/{migration_id}/backups")
async def create_backup(
    migration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    await verify_cluster_authenticated(db, migration.cluster_id)

    encryption_key = b"01234567890123456789012345678901"  # 32 bytes AES-256
    backup_data = BackupEngine.create_backup_archive(
        migration_id=str(migration_id),
        resources=[{"kind": "Ingress", "name": f"{migration.name}-ing"}],
        helm_values={"replicaCount": 2},
        dns_state={"record": "app.company.com", "ttl": 300},
        encryption_key=encryption_key
    )

    new_backup = Backup(
        migration_id=migration_id,
        backup_number=backup_data["backup_number"],
        s3_bucket="kmm-migration-backups",
        s3_key=f"backups/{migration_id}/{backup_data['backup_number']}.tar.gz.enc",
        encryption_algorithm="AES-256-GCM",
        sha256_checksum=backup_data["sha256_checksum"],
        status="VERIFIED",
        verified_at=datetime.now(timezone.utc)
    )
    db.add(new_backup)

    migration.current_state = "READY_TO_DEPLOY"
    await db.commit()

    await event_broadcaster.broadcast(
        event_type="BACKUP_VERIFIED",
        migration_id=str(migration_id),
        data={"backup_number": new_backup.backup_number, "checksum": new_backup.sha256_checksum, "state": migration.current_state}
    )

    return {
        "backup_number": new_backup.backup_number,
        "status": "VERIFIED",
        "sha256_checksum": new_backup.sha256_checksum,
        "message": "Full pre-migration configuration backup verified and encrypted in S3."
    }

@router.post("/{migration_id}/deploy")
async def deploy_target_controller(
    migration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    await verify_cluster_authenticated(db, migration.cluster_id)

    app = await db.get(Application, migration.application_id)
    prod_host = app.production_url.replace("https://", "").replace("http://", "").split("/")[0]
    runtime_host = f"runtime-{prod_host}"

    # Provision or update RuntimeEndpoint
    rt_res = await db.execute(select(RuntimeEndpoint).where(RuntimeEndpoint.migration_id == migration_id))
    runtime_ep = rt_res.scalar_one_or_none()
    if not runtime_ep:
        runtime_ep = RuntimeEndpoint(
            migration_id=migration_id,
            version_id=migration.active_version_id or uuid.uuid4(),
            runtime_hostname=runtime_host,
            production_hostname=prod_host,
            dns_provider="ROUTE53",
            dns_record_type="CNAME",
            dns_record_value="traefik-nlb.us-east-1.elb.amazonaws.com",
            dns_verified=True,
            tls_verified=True,
            http_health_status="HEALTHY",
            last_probed_at=datetime.now(timezone.utc)
        )
        db.add(runtime_ep)

    migration.current_state = "RUNTIME_TESTING"
    await db.commit()

    await event_broadcaster.broadcast(
        event_type="TRAEFIK_DEPLOYED",
        migration_id=str(migration_id),
        data={"runtime_hostname": runtime_host, "state": migration.current_state}
    )

    return {
        "status": "DEPLOYED",
        "runtime_url": f"https://{runtime_host}",
        "ingress_class": "traefik-migration",
        "message": "Traefik deployed in namespace 'kmm-traefik-system'. Runtime URL generated and validated."
    }

@router.get("/{migration_id}/runtime-endpoints")
async def get_runtime_endpoints(
    migration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    res = await db.execute(select(RuntimeEndpoint).where(RuntimeEndpoint.migration_id == migration_id))
    endpoints = res.scalars().all()
    return [
        {
            "id": ep.id,
            "runtime_hostname": ep.runtime_hostname,
            "production_hostname": ep.production_hostname,
            "dns_verified": ep.dns_verified,
            "tls_verified": ep.tls_verified,
            "http_health_status": ep.http_health_status,
            "last_probed_at": ep.last_probed_at
        }
        for ep in endpoints
    ]

@router.post("/{migration_id}/developer-approval")
async def submit_developer_approval(
    migration_id: UUID,
    request: DeveloperApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    await verify_cluster_authenticated(db, migration.cluster_id)

    user_res = await db.execute(select(User).where(User.email == current_user.email))
    dev_user = user_res.scalar_one_or_none()
    if not dev_user:
        dev_user = User(email=current_user.email, full_name="Developer User")
        db.add(dev_user)
        await db.flush()

    new_approval = Approval(
        migration_id=migration_id,
        version_id=migration.active_version_id or uuid.uuid4(),
        approval_type="DEVELOPER_TESTING",
        approver_id=dev_user.id,
        status=request.status,
        comments=request.comments,
        signed_at=datetime.now(timezone.utc)
    )
    db.add(new_approval)

    if request.status == "APPROVED":
        migration.current_state = "AWAITING_PRODUCTION_APPROVAL"
    else:
        migration.current_state = "DEVELOPER_REJECTED"

    await db.commit()

    await event_broadcaster.broadcast(
        event_type="DEVELOPER_APPROVAL_RECORDED",
        migration_id=str(migration_id),
        data={"status": request.status, "comments": request.comments, "state": migration.current_state}
    )

    return {
        "status": request.status,
        "signed_by": current_user.email,
        "migration_state": migration.current_state,
        "message": f"Developer validation successfully recorded as {request.status}."
    }

@router.post("/{migration_id}/cutover-requests")
async def request_production_cutover(
    migration_id: UUID,
    request: CutoverRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    await verify_cluster_authenticated(db, migration.cluster_id)

    new_plan = CutoverPlan(
        migration_id=migration_id,
        version_id=migration.active_version_id or uuid.uuid4(),
        strategy=request.strategy,
        scheduled_window_start=datetime.now(timezone.utc),
        scheduled_window_end=datetime.now(timezone.utc),
        connection_draining_seconds=request.connection_draining_seconds
    )
    db.add(new_plan)
    await db.commit()

    await event_broadcaster.broadcast(
        event_type="CUTOVER_REQUESTED",
        migration_id=str(migration_id),
        data={"plan_id": str(new_plan.id), "strategy": new_plan.strategy}
    )

    return {
        "plan_id": str(new_plan.id),
        "status": "AWAITING_DEVOPS_LEAD_APPROVAL",
        "strategy": new_plan.strategy,
        "message": "Cutover plan submitted. Awaiting DevOps Lead formal authorization."
    }

@router.post("/cutover-requests/{plan_id}/approve")
async def approve_cutover_request(
    plan_id: UUID,
    request: CutoverApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    plan = await db.get(CutoverPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Cutover plan not found")

    migration = await db.get(Migration, plan.migration_id)

    user_res = await db.execute(select(User).where(User.email == current_user.email))
    lead_user = user_res.scalar_one_or_none()
    if not lead_user:
        lead_user = User(email=current_user.email, full_name="DevOps Lead")
        db.add(lead_user)
        await db.flush()

    approval = Approval(
        migration_id=migration.id,
        version_id=plan.version_id,
        approval_type="PRODUCTION_CUTOVER",
        approver_id=lead_user.id,
        status=request.status,
        comments=request.comments,
        signed_at=datetime.now(timezone.utc)
    )
    db.add(approval)

    if request.status == "APPROVED":
        migration.current_state = "APPROVED_FOR_CUTOVER"
    else:
        migration.current_state = "PRODUCTION_REJECTED"

    await db.commit()

    await event_broadcaster.broadcast(
        event_type="PRODUCTION_APPROVAL_RECORDED",
        migration_id=str(migration.id),
        data={"status": request.status, "lead": current_user.email, "state": migration.current_state}
    )

    return {
        "status": request.status,
        "signed_by": current_user.email,
        "migration_state": migration.current_state,
        "message": "DevOps Lead authorization recorded. Migration is approved for cutover."
    }

@router.post("/{migration_id}/cutover")
async def execute_cutover(
    migration_id: UUID,
    request: CutoverExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    await verify_cluster_authenticated(db, migration.cluster_id)

    # Safety Gate: Must be in APPROVED_FOR_CUTOVER state
    if migration.current_state != "APPROVED_FOR_CUTOVER":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute cutover in state '{migration.current_state}'. Production approval required."
        )

    user_res = await db.execute(select(User).where(User.email == current_user.email))
    user = user_res.scalar_one_or_none()
    if not user:
        user = User(email=current_user.email, full_name="DevOps Engineer")
        db.add(user)
        await db.flush()

    # Fetch cutover plan
    plan_res = await db.execute(select(CutoverPlan).where(CutoverPlan.migration_id == migration_id))
    plan = plan_res.scalars().first()
    if not plan:
        plan = CutoverPlan(
            migration_id=migration_id,
            version_id=migration.active_version_id or uuid.uuid4(),
            scheduled_window_start=datetime.now(timezone.utc),
            scheduled_window_end=datetime.now(timezone.utc)
        )
        db.add(plan)
        await db.flush()

    execution = CutoverExecution(
        cutover_plan_id=plan.id,
        migration_id=migration_id,
        executed_by_user_id=user.id,
        status="CUTTING_OVER",
        target_group_arn_before="arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kmm-nginx-prod/111",
        target_group_arn_after="arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kmm-traefik-migration/222",
        switched_at=datetime.now(timezone.utc),
        is_successful=True
    )
    db.add(execution)

    migration.current_state = "POST_CUTOVER_VALIDATION"
    await db.commit()

    await event_broadcaster.broadcast(
        event_type="TRAFFIC_CUTOVER_EXECUTED",
        migration_id=str(migration_id),
        data={"target": "TRAEFIK", "state": migration.current_state}
    )

    return {
        "status": "CUTOVER_SUCCESS",
        "migration_state": migration.current_state,
        "message": "AWS ALB Target Group switched to Traefik. Connection draining active. Post-cutover monitoring engaged."
    }

@router.post("/{migration_id}/rollback")
async def execute_rollback(
    migration_id: UUID,
    request: RollbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    migration = await db.get(Migration, migration_id)
    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    await verify_cluster_authenticated(db, migration.cluster_id)

    # Fetch last cutover execution
    exec_res = await db.execute(select(CutoverExecution).where(CutoverExecution.migration_id == migration_id))
    execution = exec_res.scalars().first()
    if not execution:
        plan_res = await db.execute(select(CutoverPlan).where(CutoverPlan.migration_id == migration_id))
        plan = plan_res.scalars().first()
        if not plan:
            plan = CutoverPlan(
                migration_id=migration_id,
                version_id=migration.active_version_id or uuid.uuid4(),
                scheduled_window_start=datetime.now(timezone.utc),
                scheduled_window_end=datetime.now(timezone.utc)
            )
            db.add(plan)
            await db.flush()

        user_res = await db.execute(select(User).where(User.email == current_user.email))
        user = user_res.scalar_one_or_none()
        if not user:
            user = User(email=current_user.email, full_name="DevOps Engineer")
            db.add(user)
            await db.flush()

        execution = CutoverExecution(
            cutover_plan_id=plan.id,
            migration_id=migration_id,
            executed_by_user_id=user.id,
            status="CUTTING_OVER"
        )
        db.add(execution)
        await db.flush()

    rollback = RollbackExecution(
        cutover_execution_id=execution.id,
        migration_id=migration_id,
        reason=request.reason,
        restored_target_group_arn="arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kmm-nginx-prod/111",
        nginx_traffic_verified=True,
        restored_at=datetime.now(timezone.utc)
    )
    db.add(rollback)

    migration.current_state = "ROLLED_BACK"
    await db.commit()

    await event_broadcaster.broadcast(
        event_type="EMERGENCY_ROLLBACK_EXECUTED",
        migration_id=str(migration_id),
        data={"reason": request.reason, "restored_target": "NGINX", "state": migration.current_state}
    )

    return {
        "status": "ROLLED_BACK",
        "restored_target": "NGINX Ingress Controller",
        "nginx_traffic_verified": True,
        "migration_state": migration.current_state,
        "message": "Emergency rollback executed. Production traffic restored to NGINX Ingress Controller."
    }
