import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now

class Backup(Base, BaseModelMixin):
    __tablename__ = "backups"

    migration_id = Column(UUID(as_uuid=True), ForeignKey("migrations.id", ondelete="CASCADE"), nullable=False, index=True)
    backup_number = Column(String(100), unique=True, nullable=False)
    s3_bucket = Column(String(255), nullable=False)
    s3_key = Column(String(1024), nullable=False)
    encryption_algorithm = Column(String(50), default="AES-256-GCM", nullable=False)
    kms_key_id = Column(String(512), nullable=True)
    sha256_checksum = Column(String(64), nullable=False)
    status = Column(String(50), default="IN_PROGRESS", nullable=False)  # 'IN_PROGRESS', 'VERIFIED', 'FAILED', 'CORRUPT'
    verified_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    migration = relationship("Migration", back_populates="backups")
    contents = relationship("BackupContent", back_populates="backup", cascade="all, delete-orphan")

class BackupContent(Base):
    __tablename__ = "backup_contents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    backup_id = Column(UUID(as_uuid=True), ForeignKey("backups.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_kind = Column(String(50), nullable=False)
    resource_name = Column(String(255), nullable=False)
    namespace = Column(String(100), nullable=False)
    encrypted_data_ref = Column(String(512), nullable=False)
    sha256_checksum = Column(String(64), nullable=False)

    backup = relationship("Backup", back_populates="contents")
