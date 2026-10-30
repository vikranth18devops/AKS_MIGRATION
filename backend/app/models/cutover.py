import uuid
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("migration_versions.id", ondelete="RESTRICT"), nullable=False)
    approval_type = Column(String(50), nullable=False)  # 'DEVELOPER_TESTING', 'PRODUCTION_CUTOVER', 'NGINX_DECOMMISSION'
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(50), default="PENDING", nullable=False)  # 'PENDING', 'APPROVED', 'REJECTED'
    comments = Column(Text, nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)

    migration = relationship("Migration", back_populates="approvals")
    approver = relationship("User", back_populates="approvals")
    __table_args__ = (UniqueConstraint("migration_id", "version_id", "approval_type", "approver_id", name="uq_mig_approval_type"),)

class CutoverPlan(Base):
    __tablename__ = "cutover_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("migration_versions.id", ondelete="RESTRICT"), nullable=False)
    strategy = Column(String(50), default="ALB_TARGET_GROUP_INSTANT", nullable=False)
    scheduled_window_start = Column(DateTime(timezone=True), nullable=False)
    scheduled_window_end = Column(DateTime(timezone=True), nullable=False)
    connection_draining_seconds = Column(Integer, default=300, nullable=False)
    rollback_threshold_5xx_percent = Column(Numeric(5, 2), default=2.00, nullable=False)
    rollback_threshold_latency_ms = Column(Integer, default=1500, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    migration = relationship("Migration", back_populates="cutover_plans")
    executions = relationship("CutoverExecution", back_populates="plan", cascade="all, delete-orphan")

class CutoverExecution(Base):
    __tablename__ = "cutover_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cutover_plan_id = Column(UUID(as_uuid=True), ForeignKey("cutover_plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    executed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="IN_PROGRESS", nullable=False)
    target_group_arn_before = Column(String(512), nullable=True)
    target_group_arn_after = Column(String(512), nullable=True)
    switched_at = Column(DateTime(timezone=True), nullable=True)
    stabilization_ends_at = Column(DateTime(timezone=True), nullable=True)
    is_successful = Column(Boolean, nullable=True)

    plan = relationship("CutoverPlan", back_populates="executions")
    monitoring_snapshots = relationship("MonitoringSnapshot", back_populates="execution", cascade="all, delete-orphan")
    rollback = relationship("RollbackExecution", back_populates="cutover_execution", uselist=False)

class MonitoringSnapshot(Base):
    __tablename__ = "monitoring_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cutover_execution_id = Column(UUID(as_uuid=True), ForeignKey("cutover_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    http_2xx_count = Column(BigInteger, default=0, nullable=False)
    http_4xx_count = Column(BigInteger, default=0, nullable=False)
    http_5xx_count = Column(BigInteger, default=0, nullable=False)
    error_rate_percent = Column(Numeric(5, 2), default=0.00, nullable=False)
    latency_p95_ms = Column(Numeric(8, 2), default=0.00, nullable=False)
    latency_p99_ms = Column(Numeric(8, 2), default=0.00, nullable=False)
    active_connections = Column(Integer, default=0, nullable=False)
    captured_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    execution = relationship("CutoverExecution", back_populates="monitoring_snapshots")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_name = Column(String(100), nullable=False)
    threshold_value = Column(String(100), nullable=False)
    actual_value = Column(String(100), nullable=False)
    triggered_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    is_auto_rollback_trigger = Column(Boolean, default=False, nullable=False)

class RollbackExecution(Base):
    __tablename__ = "rollback_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cutover_execution_id = Column(UUID(as_uuid=True), ForeignKey("cutover_executions.id", ondelete="RESTRICT"), unique=True, nullable=False)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    triggered_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_automated = Column(Boolean, default=False, nullable=False)
    reason = Column(Text, nullable=False)
    restored_target_group_arn = Column(String(512), nullable=False)
    nginx_traffic_verified = Column(Boolean, default=False, nullable=False)
    restored_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    cutover_execution = relationship("CutoverExecution", back_populates="rollback")
