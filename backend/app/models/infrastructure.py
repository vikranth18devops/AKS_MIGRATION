import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now

class Cluster(Base, BaseModelMixin):
    __tablename__ = "clusters"

    name = Column(String(100), unique=True, nullable=False, index=True)
    cloud_provider = Column(String(50), default="AWS", nullable=False)
    environment = Column(String(50), nullable=False)  # 'production', 'staging', 'dev'
    api_endpoint = Column(String(512), nullable=False)
    kubernetes_version = Column(String(50), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)

    credential = relationship("ClusterCredential", back_populates="cluster", uselist=False, cascade="all, delete-orphan")
    namespaces = relationship("Namespace", back_populates="cluster", cascade="all, delete-orphan")
    controllers = relationship("ControllerInstallation", back_populates="cluster", cascade="all, delete-orphan")
    snapshots = relationship("DiscoverySnapshot", back_populates="cluster", cascade="all, delete-orphan")
    migrations = relationship("Migration", back_populates="cluster")

class ClusterCredential(Base):
    __tablename__ = "cluster_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), unique=True, nullable=False)
    auth_method = Column(String(50), nullable=False)  # 'AWS_IAM_ROLE', 'SERVICE_ACCOUNT', 'OIDC'
    role_arn = Column(String(512), nullable=True)
    kms_key_arn = Column(String(512), nullable=True)
    encrypted_kubeconfig_ref = Column(String(512), nullable=True)
    last_validated_at = Column(DateTime(timezone=True), nullable=True)
    validation_status = Column(String(50), default="PENDING", nullable=False)

    cluster = relationship("Cluster", back_populates="credential")

class Namespace(Base):
    __tablename__ = "namespaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    status = Column(String(50), default="Active", nullable=False)
    discovered_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    cluster = relationship("Cluster", back_populates="namespaces")
    applications = relationship("Application", back_populates="namespace", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("cluster_id", "name", name="uq_cluster_ns"),)

class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    namespace_id = Column(UUID(as_uuid=True), ForeignKey("namespaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    owner_email = Column(String(255), nullable=True)
    production_url = Column(String(512), nullable=False)
    health_endpoint = Column(String(255), default="/healthz", nullable=False)
    expected_status_code = Column(Integer, default=200, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    namespace = relationship("Namespace", back_populates="applications")
    migrations = relationship("Migration", back_populates="application")
    __table_args__ = (UniqueConstraint("namespace_id", "name", name="uq_ns_app"),)

class ControllerInstallation(Base):
    __tablename__ = "controller_installations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), nullable=False)
    controller_type = Column(String(50), nullable=False)  # 'NGINX', 'TRAEFIK', 'ENVOY', 'ISTIO'
    version = Column(String(50), nullable=False)
    namespace = Column(String(100), nullable=False)
    ingress_class_name = Column(String(100), nullable=False)
    helm_release_name = Column(String(100), nullable=True)
    is_active_production = Column(Boolean, default=False, nullable=False)
    health_status = Column(String(50), default="HEALTHY", nullable=False)
    discovered_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    cluster = relationship("Cluster", back_populates="controllers")

class DiscoverySnapshot(Base):
    __tablename__ = "discovery_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), nullable=False)
    snapshot_hash = Column(String(64), nullable=False)
    total_ingresses = Column(Integer, default=0, nullable=False)
    total_services = Column(Integer, default=0, nullable=False)
    raw_summary = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    cluster = relationship("Cluster", back_populates="snapshots")
    resources = relationship("DiscoveredResource", back_populates="snapshot", cascade="all, delete-orphan")

class DiscoveredResource(Base):
    __tablename__ = "discovered_resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("discovery_snapshots.id", ondelete="CASCADE"), nullable=False)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), nullable=False)
    namespace = Column(String(100), nullable=False)
    kind = Column(String(50), nullable=False)  # 'Ingress', 'Service', 'Secret', 'ConfigMap'
    name = Column(String(255), nullable=False)
    api_version = Column(String(100), nullable=False)
    manifest = Column(JSONB, nullable=False)
    checksum = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    snapshot = relationship("DiscoverySnapshot", back_populates="resources")
