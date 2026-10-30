from app.core.database import Base
from app.models.auth import User, Role, Permission, UserRoleAssignment
from app.models.infrastructure import (
    Cluster,
    ClusterCredential,
    Namespace,
    Application,
    ControllerInstallation,
    DiscoverySnapshot,
    DiscoveredResource,
)
from app.models.migration import (
    Migration,
    MigrationVersion,
    Assessment,
    AssessmentFinding,
    ConfigurationArtifact,
)
from app.models.backup import Backup, BackupContent
from app.models.testing import (
    WorkflowExecution,
    WorkflowStep,
    RuntimeEndpoint,
    TestAssignment,
    TestResult,
)
from app.models.cutover import (
    Approval,
    CutoverPlan,
    CutoverExecution,
    MonitoringSnapshot,
    Alert,
    RollbackExecution,
)
from app.models.audit import (
    IntegrationConnection,
    Notification,
    EvidenceArtifact,
    IdempotencyRecord,
    AuditEvent,
)

__all__ = [
    "Base",
    "User",
    "Role",
    "Permission",
    "UserRoleAssignment",
    "Cluster",
    "ClusterCredential",
    "Namespace",
    "Application",
    "ControllerInstallation",
    "DiscoverySnapshot",
    "DiscoveredResource",
    "Migration",
    "MigrationVersion",
    "Assessment",
    "AssessmentFinding",
    "ConfigurationArtifact",
    "Backup",
    "BackupContent",
    "WorkflowExecution",
    "WorkflowStep",
    "RuntimeEndpoint",
    "TestAssignment",
    "TestResult",
    "Approval",
    "CutoverPlan",
    "CutoverExecution",
    "MonitoringSnapshot",
    "Alert",
    "RollbackExecution",
    "IntegrationConnection",
    "Notification",
    "EvidenceArtifact",
    "IdempotencyRecord",
    "AuditEvent",
]
