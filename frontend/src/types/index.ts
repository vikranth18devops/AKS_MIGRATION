export type RoleType = 'PLATFORM_ADMIN' | 'DEVOPS_ENGINEER' | 'DEVELOPER' | 'DEVOPS_LEAD' | 'AUDITOR';

export type MigrationState =
  | 'DRAFT'
  | 'DISCOVERING'
  | 'ASSESSMENT'
  | 'BLOCKED'
  | 'READY_FOR_BACKUP'
  | 'BACKING_UP'
  | 'BACKUP_VERIFICATION'
  | 'READY_TO_DEPLOY'
  | 'DEPLOYING_TARGET'
  | 'CONFIGURING_ROUTES'
  | 'VALIDATING_TARGET'
  | 'RUNTIME_TESTING'
  | 'DEVELOPER_REJECTED'
  | 'DEVELOPER_APPROVED'
  | 'AWAITING_PRODUCTION_APPROVAL'
  | 'PRODUCTION_REJECTED'
  | 'APPROVED_FOR_CUTOVER'
  | 'CUTTING_OVER'
  | 'POST_CUTOVER_VALIDATION'
  | 'STABILIZING'
  | 'ROLLBACK_IN_PROGRESS'
  | 'ROLLED_BACK'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Cluster {
  id: string;
  name: string;
  cloud_provider: 'AWS' | 'Azure' | 'GCP' | 'Google Cloud' | 'On-Premises';
  environment: 'production' | 'staging' | 'development';
  api_endpoint: string;
  kubernetes_version: string;
  status: 'ACTIVE' | 'DEGRADED' | 'DISCONNECTED';
  is_authenticated: boolean;
  auth_method?: string;
  namespaces_count: number;
  namespaces_list?: string[];
  nodes_list?: {
    name: string;
    role: string;
    status: string;
    cpu: string;
    cpuUsage?: string;
    memory: string;
    memUsage?: string;
    kernel?: string;
    internalIp?: string;
    conditions?: string;
  }[];
  pods_list?: {
    name: string;
    namespace: string;
    ready?: string;
    status: string;
    restarts?: number;
    cpu?: string;
    memory?: string;
    node?: string;
    age?: string;
  }[];
  nodes_count?: number;
  node_type?: string;
  workloads_count?: number;
  workloads?: {
    pods: number;
    deployments: number;
    statefulsets: number;
    daemonsets: number;
    services: number;
  };
  components_in_use?: {
    current_ingress: string;
    target_ingress: string;
    gateway_api_crds: string;
    cert_manager: string;
    cni_plugin: string;
    alb_controller: string;
  };
  migration_status?: {
    state: string;
    phase: string;
    progress_percent: number;
    source_controller: string;
    target_controller: string;
    traffic_split_percent: number;
    has_verified_backup: boolean;
    backup_storage: string;
    zero_downtime_guarantee: string;
  };
  ingress_controllers: string[];
  created_at: string;
}

export interface DiscoveredIngress {
  id: string;
  name: string;
  namespace: string;
  hosts: string[];
  paths: string[];
  tls_secrets: string[];
  annotations_count: number;
  backend_services: string[];
  raw_annotations: Record<string, string>;
}

export interface Finding {
  id: string;
  severity: 'INFO' | 'WARNING' | 'BLOCKER';
  annotation_or_feature: string;
  source_value?: string;
  target_mapping?: string;
  remediation_suggestion: string;
  is_resolved: boolean;
}

export interface Assessment {
  assessment_id: string;
  migration_id: string;
  target_controller: string;
  is_compatible: boolean;
  blocker_count: number;
  warning_count: number;
  findings: Finding[];
  canonical_ir?: any;
  assessed_at: string;
}

export interface Migration {
  id: string;
  migration_number?: number;
  name: string;
  cluster_id: string;
  cluster_name?: string;
  namespace?: string;
  application_name?: string;
  production_url?: string;
  source_controller: string;
  target_controller: string;
  current_state: MigrationState;
  has_verified_backup?: boolean;
  developer_approved?: boolean;
  production_approved?: boolean;
  runtime_url?: string;
  draining_seconds_left?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface DiffData {
  migration_id: string;
  version_number: number;
  source_nginx_yaml: string;
  target_traefik_yaml: string;
  changed_directives_summary: string[];
}

export interface RuntimeEndpoint {
  id: string;
  runtime_hostname: string;
  production_hostname: string;
  dns_verified: boolean;
  tls_verified: boolean;
  http_health_status: 'HEALTHY' | 'DEGRADED' | 'PENDING' | 'FAILED';
  latency_ms?: number;
  last_probed_at?: string;
}

export interface AuditEvent {
  event_id: string;
  sequence_number?: number;
  occurred_at: string;
  actor_type: string;
  actor_id: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED' | 'PENDING';
  migration_id?: string;
  resource_kind?: string;
  reason?: string;
  evidence_reference?: string;
}

export interface Integration {
  integration_type: string;
  name: string;
  endpoint: string;
  is_healthy: boolean;
  capabilities: string[];
  last_checked_at?: string;
  error_message?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actor?: string;
}

export interface MonitoringMetric {
  timestamp: string;
  http_2xx: number;
  http_4xx: number;
  http_5xx: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  active_connections: number;
}

export interface CheckItem {
  id: string;
  category?: string;
  name: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  details: string;
  latency_ms?: number;
  evidence?: Record<string, any>;
}

export interface PrerequisitesValidationResponse {
  cluster_id: string;
  cluster_name: string;
  cloud_provider: string;
  overall_status: 'PASSED' | 'WARNING' | 'FAILED';
  all_prerequisites_met: boolean;
  checks: CheckItem[];
  validated_at: string;
  message: string;
}

export interface TraefikReadinessResponse {
  migration_id: string;
  target_controller: string;
  overall_status: string;
  all_checks_passed: boolean;
  checks: CheckItem[];
  migration_impact_summary: {
    source_controller: string;
    target_controller: string;
    ingress_resource: string;
    production_hostname: string;
    temporary_runtime_url: string;
    cluster_changes: string[];
  };
  validated_at: string;
  message: string;
}

