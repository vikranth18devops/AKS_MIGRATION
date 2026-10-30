import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now

class User(Base, BaseModelMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    external_idp_id = Column(String(255), unique=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    role_assignments = relationship("UserRoleAssignment", back_populates="user", cascade="all, delete-orphan")
    owned_migrations = relationship("Migration", back_populates="devops_owner")
    approvals = relationship("Approval", back_populates="approver")

class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    permissions = relationship("Permission", back_populates="role", cascade="all, delete-orphan")
    assignments = relationship("UserRoleAssignment", back_populates="role")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    resource = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)

    role = relationship("Role", back_populates="permissions")
    __table_args__ = (UniqueConstraint("role_id", "resource", "action", name="uq_role_perm"),)

class UserRoleAssignment(Base):
    __tablename__ = "user_role_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    scope_cluster_id = Column(UUID(as_uuid=True), nullable=True)
    scope_namespace = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="role_assignments")
    role = relationship("Role", back_populates="assignments")
    __table_args__ = (UniqueConstraint("user_id", "role_id", "scope_cluster_id", "scope_namespace", name="uq_user_role_scope"),)
