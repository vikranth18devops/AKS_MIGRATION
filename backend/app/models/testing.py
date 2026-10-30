import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now

class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    temporal_workflow_id = Column(String(255), nullable=False)
    temporal_run_id = Column(String(255), nullable=False)
    current_step = Column(String(100), nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="RUNNING", nullable=False)

    steps = relationship("WorkflowStep", back_populates="execution", cascade="all, delete-orphan")

class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_execution_id = Column(UUID(as_uuid=True), ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    step_name = Column(String(100), nullable=False)
    step_order = Column(Integer, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    attempt_count = Column(Integer, default=1, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_summary = Column(Text, nullable=True)

    execution = relationship("WorkflowExecution", back_populates="steps")
    __table_args__ = (UniqueConstraint("workflow_execution_id", "step_name", name="uq_wf_step"),)

class RuntimeEndpoint(Base, BaseModelMixin):
    __tablename__ = "runtime_endpoints"

    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("migration_versions.id", ondelete="RESTRICT"), nullable=False)
    runtime_hostname = Column(String(512), unique=True, nullable=False)
    production_hostname = Column(String(512), nullable=False)
    dns_provider = Column(String(50), default="ROUTE53", nullable=False)
    dns_record_type = Column(String(10), default="CNAME", nullable=False)
    dns_record_value = Column(String(512), nullable=False)
    tls_certificate_arn = Column(String(512), nullable=True)
    dns_verified = Column(Boolean, default=False, nullable=False)
    tls_verified = Column(Boolean, default=False, nullable=False)
    http_health_status = Column(String(50), default="PENDING", nullable=False)
    last_probed_at = Column(DateTime(timezone=True), nullable=True)

    migration = relationship("Migration", back_populates="runtime_endpoints")
    assignments = relationship("TestAssignment", back_populates="endpoint", cascade="all, delete-orphan")

class TestAssignment(Base):
    __tablename__ = "test_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    runtime_endpoint_id = Column(UUID(as_uuid=True), ForeignKey("runtime_endpoints.id", ondelete="CASCADE"), nullable=False)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    status = Column(String(50), default="ASSIGNED", nullable=False)

    endpoint = relationship("RuntimeEndpoint", back_populates="assignments")
    results = relationship("TestResult", back_populates="assignment", cascade="all, delete-orphan")

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("test_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_name = Column(String(255), nullable=False)
    is_passed = Column(Boolean, nullable=False)
    http_status_code = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    response_payload_sample = Column(Text, nullable=True)
    defect_notes = Column(Text, nullable=True)
    tested_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    assignment = relationship("TestAssignment", back_populates="results")
