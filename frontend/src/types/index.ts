export interface Cluster {
  id: string;
  name: string;
  cloud_provider: string;
  environment: string;
  api_endpoint: string;
  kubernetes_version?: string;
  status: string;
  created_at: string;
}

export interface Finding {
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
  application_name?: string;
  production_url?: string;
  source_controller: string;
  target_controller: string;
  current_state: string;
  has_verified_backup?: boolean;
  developer_approved?: boolean;
  production_approved?: boolean;
  runtime_url?: string;
  created_at: string;
  updated_at: string;
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
  http_health_status: string;
  last_probed_at?: string;
}

export interface AuditEvent {
  event_id: string;
  sequence_number?: number;
  occurred_at: string;
  actor_type: string;
  actor_id: string;
  action: string;
  outcome: string;
  migration_id?: string;
  reason?: string;
}

export interface Integration {
  integration_type: string;
  name: string;
  endpoint: string;
  is_healthy: boolean;
  capabilities: string[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actor?: string;
}
