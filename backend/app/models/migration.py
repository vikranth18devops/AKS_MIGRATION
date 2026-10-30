import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now

class Migration(Base, BaseModelMixin):
    __tablename__ = "migrations"

    migration_number = Column(Integer, primary_key=False, autoincrement=True, unique=True)
    name = Column(String(255), nullable=False)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="RESTRICT"), nullable=False, index=True)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="RESTRICT"), nullable=False)
    devops_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    source_controller = Column(String(50), default="NGINX", nullable=False)
    target_controller = Column(String(50), default="TRAEFIK", nullable=False)  # 'TRAEFIK', 'ENVOY_GATEWAY', 'ISTIO_GATEWAY'
    current_state = Column(String(50), default="DRAFT", nullable=False, index=True)
    active_version_id = Column(UUID(as_uuid=True), nullable=True)
    temporal_workflow_id = Column(String(255), unique=True, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    cluster = relationship("Cluster", back_populates="migrations")
    application = relationship("Application", back_populates="migrations")
    devops_owner = relationship("User", back_populates="owned_migrations")
    versions = relationship("MigrationVersion", back_populates="migration", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="migration", cascade="all, delete-orphan")
    artifacts = relationship("ConfigurationArtifact", back_populates="migration", cascade="all, delete-orphan")
    backups = relationship("Backup", back_populates="migration", cascade="all, delete-orphan")
    runtime_endpoints = relationship("RuntimeEndpoint", back_populates="migration", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="migration", cascade="all, delete-orphan")
    cutover_plans = relationship("CutoverPlan", back_populates="migration", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="migration")

class MigrationVersion(Base):
    __tablename__ = "migration_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    source_manifest_hash = Column(String(64), nullable=False)
    canonical_ir = Column(JSONB, nullable=False)
    target_manifests = Column(JSONB, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    migration = relationship("Migration", back_populates="versions")
    __table_args__ = (UniqueConstraint("migration_id", "version_number", name="uq_mig_version"),)

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("migration_versions.id", ondelete="CASCADE"), nullable=False)
    target_controller = Column(String(50), nullable=False)
    is_compatible = Column(Boolean, default=False, nullable=False)
    blocker_count = Column(Integer, default=0, nullable=False)
    warning_count = Column(Integer, default=0, nullable=False)
    assessed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    migration = relationship("Migration", back_populates="assessments")
    findings = relationship("AssessmentFinding", back_populates="assessment", cascade="all, delete-orphan")

class AssessmentFinding(Base):
    __tablename__ = "assessment_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(String(20), nullable=False)  # 'INFO', 'WARNING', 'BLOCKER'
    annotation_or_feature = Column(String(255), nullable=False)
    source_value = Column(Text, nullable=True)
    remediation_suggestion = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    assessment = relationship("Assessment", back_populates="findings")

class ConfigurationArtifact(Base):
    __tablename__ = "configuration_artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("migration_versions.id", ondelete="CASCADE"), nullable=False)
    artifact_type = Column(String(50), nullable=False)  # 'TRAEFIK_INGRESSROUTE', 'MIDDLEWARE', 'HTTPROUTE'
    resource_name = Column(String(255), nullable=False)
    namespace = Column(String(100), nullable=False)
    generated_yaml = Column(Text, nullable=False)
    dry_run_passed = Column(Boolean, default=False, nullable=False)
    applied_to_cluster = Column(Boolean, default=False, nullable=False)
    applied_at = Column(DateTime(timezone=True), nullable=True)

    migration = relationship("Migration", back_populates="artifacts")
