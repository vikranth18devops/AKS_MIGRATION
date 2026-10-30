import uuid
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now

class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_type = Column(String(50), nullable=False)  # 'KUBERNETES_API', 'HELM', 'ROUTE53', 'AWS_ALB', 'PROMETHEUS'
    name = Column(String(100), nullable=False)
    endpoint = Column(String(512), nullable=False)
    is_healthy = Column(Boolean, default=True, nullable=False)
    last_checked_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    error_message = Column(Text, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class EvidenceArtifact(Base):
    __tablename__ = "evidence_artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_category = Column(String(50), nullable=False)  # 'TEST_SCREENSHOT', 'CURL_OUTPUT', 'DIFF_YAML', 'LOG_EXTRACT'
    s3_location = Column(String(1024), nullable=False)
    sha256_checksum = Column(String(64), nullable=False)
    uploaded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    request_path = Column(String(255), nullable=False)
    response_status = Column(Integer, nullable=False)
    response_body = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence_number = Column(BigInteger, primary_key=False, autoincrement=True)
    occurred_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    actor_type = Column(String(50), nullable=False)  # 'USER', 'SYSTEM', 'TEMPORAL_WORKER'
    actor_id = Column(String(255), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    outcome = Column(String(50), nullable=False)  # 'SUCCESS', 'FAILURE', 'DENIED', 'PENDING'
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="SET NULL"), nullable=True, index=True)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="SET NULL"), nullable=True)
    namespace = Column(String(100), nullable=True)
    resource_kind = Column(String(100), nullable=True)
    resource_name = Column(String(255), nullable=True)
    request_id = Column(String(100), nullable=True)
    workflow_id = Column(String(255), nullable=True)
    reason = Column(Text, nullable=True)
    error_code = Column(String(100), nullable=True)
    error_summary = Column(Text, nullable=True)
    evidence_reference = Column(String(512), nullable=True)
    raw_event_payload = Column(JSONB, nullable=True)

    migration = relationship("Migration", back_populates="audit_events")
