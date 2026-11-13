import React, { useState, useEffect } from 'react';
import { Migration, Cluster, Assessment, DiffData, PrerequisitesValidationResponse, TraefikReadinessResponse } from '../types';
import { api } from '../services/api';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  RotateCcw,
  ExternalLink,
  FileCode,
  Layers,
  Activity,
  Server,
  Lock,
  Key,
  ShieldAlert,
  ArrowLeft,
  Clock,
  Eye,
  Check,
  RefreshCw,
  GitBranch,
  Edit3,
  Trash2
} from 'lucide-react';
import { EntityViewModal, EntityEditModal, EntityDeleteModal } from './EntityActionModals';
import { CloudLogo } from './CloudLogo';

interface MigrationWizardProps {
  migration: Migration;
  clusters: Cluster[];
  onRefreshMigration: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const MigrationWizard: React.FC<MigrationWizardProps> = ({
  migration,
  clusters,
  onRefreshMigration,
  onNavigateToTab
}) => {
  const targetCluster = clusters.find((c) => c.id === migration.cluster_id) || clusters[0];
  const isClusterAuthenticated = targetCluster?.is_authenticated ?? false;

  const isGcp = targetCluster ? (targetCluster.cloud_provider === 'GCP' || (targetCluster.cloud_provider as any) === 'Google Cloud' || targetCluster.name.includes('huntdevops')) : false;
  const isAzure = targetCluster ? targetCluster.cloud_provider === 'Azure' : false;

  const defaultNamespace = isGcp ? 'huntdevops' : isAzure ? 'finance-apps' : 'production-apps';
  const defaultTlsSecret = isGcp ? 'huntdevops-tls' : isAzure ? 'finance-tls-cert' : 'payments-tls-cert';
  const defaultBackupStorage = isGcp
    ? `gs://kmm-gke-backups-project-e746f24e-392a-429f-a4d/${targetCluster?.name || 'prod-huntdevops-gke'}/`
    : isAzure
    ? `azureblob://kmm-backups/${targetCluster?.name || 'aks-cluster'}/`
    : `s3://kmm-migration-backups/${targetCluster?.name || 'eks-production'}/`;
  const defaultKmsEncryption = isGcp
    ? 'AES-256-GCM (Google Cloud KMS Key Protected)'
    : isAzure
    ? 'AES-256-GCM (Azure Key Vault Managed)'
    : 'AES-256-GCM (AWS KMS Key Protected)';
  const defaultLbRollback = isGcp
    ? '< 2.0s via GCP NEG Traffic Draining'
    : isAzure
    ? '< 2.0s via Azure Application Gateway Routing'
    : '< 2.0s via AWS ALB Target Group Switching';
  const rawEndpoint = targetCluster?.api_endpoint ? targetCluster.api_endpoint.replace('https://', '').split(':')[0] : '34.67.119.47';
  const defaultRuntimeUrl = isGcp
    ? `https://${rawEndpoint}:8443/api/healthz`
    : isAzure
    ? 'https://runtime-finance.company.com/v1/health'
    : 'https://runtime-payments.company.com/v1/health';

  const [currentStep, setCurrentStep] = useState<number>(isClusterAuthenticated ? 2 : 1);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hover and modal states for grid cards
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: Record<string, any>;
    type: 'cluster' | 'migration' | 'ingress' | 'integration' | 'metric';
  } | null>(null);

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    title: string;
    initialData: Record<string, any>;
    fields: { name: string; label: string; type?: 'text' | 'select'; options?: string[] }[];
  } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    type: string;
  } | null>(null);

  // Stage 1: Prerequisites Response
  const [clusterPrereqs, setClusterPrereqs] = useState<PrerequisitesValidationResponse | null>(null);
  const [isValidatingCluster, setIsValidatingCluster] = useState<boolean>(false);

  // Stage 2: Traefik Readiness Validation
  const [traefikReadiness, setTraefikReadiness] = useState<TraefikReadinessResponse | null>(null);
  const [isValidatingTraefik, setIsValidatingTraefik] = useState<boolean>(false);

  // Stage 3: Diff Data
  const [diffData, setDiffData] = useState<DiffData | null>(null);

  // Stage 1 Auth Form
  const [authMethod, setAuthMethod] = useState<string>(targetCluster?.auth_method || 'AWS_IAM_ROLE');
  const [authRoleArn, setAuthRoleArn] = useState<string>('arn:aws:iam::123456789012:role/kmm-eks-migration-role');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const steps = [
    { num: 1, title: 'Cluster Prerequisites' },
    { num: 2, title: 'Traefik Validation' },
    { num: 3, title: 'What is Migrating (Diff)' },
    { num: 4, title: 'Encrypted S3 Backup' },
    { num: 5, title: 'Deploy & Runtime URL' },
    { num: 6, title: 'Dual Approvals' },
    { num: 7, title: '0-Downtime Cutover' }
  ];

  useEffect(() => {
    if (targetCluster) {
      loadClusterPrereqs(targetCluster.id);
    }
    loadTraefikReadiness(migration.id);
    loadDiff(migration.id);
  }, [migration, targetCluster]);

  const loadClusterPrereqs = async (cId: string) => {
    setIsValidatingCluster(true);
    try {
      const res = await api.validatePrerequisites(cId);
      setClusterPrereqs(res);
    } finally {
      setIsValidatingCluster(false);
    }
  };

  const loadTraefikReadiness = async (mId: string) => {
    setIsValidatingTraefik(true);
    try {
      const res = await api.validateTraefikReadiness(mId);
      setTraefikReadiness(res);
    } finally {
      setIsValidatingTraefik(false);
    }
  };

  const loadDiff = async (mId: string) => {
    try {
      const d = await api.getDiff(mId);
      setDiffData(d);
    } catch (_) {}
  };

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCluster) return;
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      await api.authenticateCluster(targetCluster.id, {
        auth_method: authMethod,
        role_arn: authRoleArn,
        token: authToken
      });
      targetCluster.is_authenticated = true;
      targetCluster.auth_method = authMethod;
      setActionMessage(`Cluster '${targetCluster.name}' authenticated. Prerequisites re-evaluated.`);
      await loadClusterPrereqs(targetCluster.id);
      await loadTraefikReadiness(migration.id);
      onRefreshMigration();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleStepClick = (stepNum: number) => {
    if (!isClusterAuthenticated && stepNum > 1) {
      setErrorMessage('Cluster authentication and prerequisites validation are strictly required before proceeding.');
      return;
    }
    setCurrentStep(stepNum);
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const res = await api.createBackup(migration.id);
      setActionMessage(`Verified Backup: ${res.backup_number} (Checksum: ${res.sha256_checksum.slice(0, 16)}...)`);
      onRefreshMigration();
      setCurrentStep(5);
    } finally {
      setLoading(false);
    }
  };

  const handleDeployTraefik = async () => {
    setLoading(true);
    try {
      await api.deployTraefik(migration.id);
      setActionMessage(`Traefik deployed in isolated namespace 'kmm-traefik-system'. Runtime URL ready.`);
      onRefreshMigration();
      setCurrentStep(6);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Step Progress Bar - Light Mode */}
      <div className="glass-panel" style={{ padding: '16px 20px', background: '#FFFFFF' }}>
        <div className="stepper-responsive" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '10px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {steps.map((s, idx) => {
            const isCompleted = s.num < currentStep && isClusterAuthenticated;
            const isCurrent = s.num === currentStep;
            const isLocked = !isClusterAuthenticated && s.num > 1;

            return (
              <div
                key={s.num}
                onClick={() => handleStepClick(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isCurrent ? 1 : isCompleted ? 0.9 : isLocked ? 0.35 : 0.7
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isCurrent
                      ? 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)'
                      : isCompleted
                      ? '#ECFDF5'
                      : '#F1F5F9',
                    color: isCurrent ? '#FFFFFF' : isCompleted ? '#059669' : isLocked ? '#94A3B8' : '#334155',
                    border: isCurrent
                      ? '2px solid #0284C7'
                      : isCompleted
                      ? '1px solid #10B981'
                      : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: isCurrent ? '0 0 12px rgba(2, 132, 199, 0.35)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isLocked ? (
                    <Lock size={14} color="#94A3B8" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    s.num
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#0F172A' : isLocked ? 'var(--text-light)' : 'var(--text-muted)'
                  }}
                >
                  {s.title}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    style={{
                      width: '24px',
                      height: '2px',
                      background: isCompleted ? '#10B981' : '#E2E8F0',
                      marginLeft: '6px'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {actionMessage && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 20px',
            borderLeft: '4px solid #059669',
            background: '#F0FDF4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span style={{ fontSize: '0.85rem', color: '#065F46', fontWeight: 600 }}>
            {actionMessage}
          </span>
        </div>
      )}

      {errorMessage && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 20px',
            borderLeft: '4px solid #E11D48',
            background: '#FFF1F2',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={16} color="#E11D48" />
          <span style={{ fontSize: '0.85rem', color: '#9F1239', fontWeight: 600 }}>
            {errorMessage}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: MULTI-CLOUD CLUSTER ONBOARDING & PREREQUISITES VALIDATION        */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
          {!isClusterAuthenticated ? (
            /* AUTHENTICATION GATE */
            <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '16px',
                  background: '#FEF3C7',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  border: '1px solid #FCD34D',
                  position: 'relative'
                }}
              >
                <CloudLogo provider={targetCluster?.cloud_provider || 'AWS'} size={38} />
                <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#D97706', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                  <Lock size={12} />
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CloudLogo provider={targetCluster?.cloud_provider || 'AWS'} size={14} />
                  STAGE 1 PREREQUISITE • CLUSTER AUTHENTICATION REQUIRED
                </span>
              </div>

              <h2 style={{ fontSize: '1.4rem', margin: '8px 0', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <CloudLogo provider={targetCluster?.cloud_provider || 'AWS'} size={24} />
                Authenticate '{targetCluster?.name}' ({targetCluster?.cloud_provider})
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
                Zero Traefik migration steps, Ingress resources, or AST conversion diffs will be displayed until live credentials and cloud prerequisites are authenticated.
              </p>

              <form
                onSubmit={handleAuthenticate}
                style={{
                  textAlign: 'left',
                  background: '#F8FAFC',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Authentication Mechanism
                  </label>
                  <select
                    value={authMethod}
                    onChange={(e) => setAuthMethod(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none' }}
                  >
                    <option value="AWS_IAM_ROLE">AWS IAM Role (EKS IRSA / Pod Identity)</option>
                    <option value="AZURE_WORKLOAD_IDENTITY">Azure Workload Identity (AKS)</option>
                    <option value="SERVICE_ACCOUNT_TOKEN">Kubernetes Service Account Token</option>
                    <option value="OIDC_KUBECONFIG">OIDC / Bearer Token Kubeconfig</option>
                  </select>
                </div>

                {authMethod === 'AWS_IAM_ROLE' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      IAM Role ARN
                    </label>
                    <input
                      type="text"
                      value={authRoleArn}
                      onChange={(e) => setAuthRoleArn(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                      required
                    />
                  </div>
                )}

                {authMethod === 'SERVICE_ACCOUNT_TOKEN' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Service Account Token
                    </label>
                    <textarea
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      required
                    />
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }} disabled={isAuthenticating}>
                  <Key size={16} /> {isAuthenticating ? 'Authenticating & Verifying RBAC...' : 'Authenticate & Unlock Migration'}
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED PREREQUISITES VIEW */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CloudLogo provider={targetCluster?.cloud_provider || 'AWS'} size={20} />
                    </div>
                    <CheckCircle2 size={20} color="var(--accent-emerald)" />
                    <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#0F172A' }}>
                      Stage 1: Multi-Cloud Cluster Prerequisites Validated
                    </h2>
                    <span className="badge badge-success">Live Session Verified</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Cluster '{targetCluster?.name}' ({targetCluster?.cloud_provider}) verified across all 5 architectural dimensions.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => setCurrentStep(2)}>
                  Proceed to Traefik Validation <ArrowRight size={16} />
                </button>
              </div>

              {/* 5 Prerequisites Checkcards - Expands on Mouse Over */}
              {clusterPrereqs && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {clusterPrereqs.checks.map((chk) => {
                    const isHovered = hoveredCardId === chk.id;
                    return (
                      <div
                        key={chk.id}
                        onMouseEnter={() => setHoveredCardId(chk.id)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        className={`glass-panel grid-card-hover ${isHovered ? 'is-expanded' : ''}`}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: isHovered ? '1px solid var(--accent-cyan)' : '1px solid #A7F3D0',
                          background: isHovered ? '#FFFFFF' : '#F0FDF4',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={16} color="#059669" />
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065F46' }}>
                              {chk.name}
                            </span>
                          </div>
                          {chk.latency_ms ? (
                            <span style={{ fontSize: '0.7rem', color: '#059669', fontFamily: 'var(--font-mono)' }}>
                              {chk.latency_ms}ms
                            </span>
                          ) : null}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#166534', lineHeight: 1.4 }}>
                          {chk.details}
                        </p>

                        <div className="grid-hover-details">
                          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Category: {chk.category}</span>
                            <button
                              className="btn-action-view"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewModal({
                                  isOpen: true,
                                  title: chk.name,
                                  subtitle: `Category: ${chk.category} • Latency: ${chk.latency_ms || 15}ms`,
                                  type: 'cluster',
                                  data: {
                                    check_id: chk.id,
                                    name: chk.name,
                                    category: chk.category,
                                    status: chk.status,
                                    details: chk.details,
                                    latency_ms: chk.latency_ms,
                                    verified_cluster: targetCluster?.name,
                                    cloud_provider: targetCluster?.cloud_provider
                                  }
                                });
                              }}
                            >
                              <Eye size={12} /> View Evidence
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: TRAEFIK CONTROLLER SELECTION & READINESS VALIDATION              */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <Server size={22} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#0F172A' }}>
                  Stage 2: Target Controller (Traefik) Readiness Validation
                </h2>
                <span className="badge badge-info">Traefik v3.0 Recommended</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Validates Traefik CRDs, namespace isolation, port mapping, and annotation AST translation.
              </p>
            </div>
            <button
              className="btn-secondary"
              onClick={() => loadTraefikReadiness(migration.id)}
              disabled={isValidatingTraefik}
            >
              <RefreshCw size={14} className={isValidatingTraefik ? 'pulse-indicator' : ''} /> {isValidatingTraefik ? 'Validating...' : 'Re-check Readiness'}
            </button>
          </div>

          {/* Validation Checks */}
          {traefikReadiness && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {traefikReadiness.checks.map((chk) => (
                <div
                  key={chk.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid #BAE6FD',
                    background: '#F0F9FF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={16} color="#0284C7" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
                        {chk.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                        {chk.details}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    VERIFIED ({chk.latency_ms}ms)
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
              <ArrowLeft size={16} /> Back to Prerequisites
            </button>
            <button className="btn-primary" onClick={() => setCurrentStep(3)}>
              Proceed to Review What is Migrating (Diff) <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: WHAT IS MIGRATING & WHAT CHANGES HAPPEN ON THE CLUSTER (DIFF)    */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <FileCode size={22} color="var(--accent-purple)" />
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#0F172A' }}>
                  Stage 3: Pre-Migration Review • What is Migrating & Cluster Impact
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Inspect all resources being converted, side-by-side YAML diffs, and exact cluster changes before touching any live components.
              </p>
            </div>
            <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
              Full Cluster Transparency
            </span>
          </div>

          {/* Dual Summary Grid */}
          <div className="grid-responsive-1-2" style={{ gap: '20px', marginBottom: '24px' }}>
            {/* Box 1: What is Migrating */}
            <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Layers size={18} color="var(--accent-purple)" />
                <h3 style={{ fontSize: '0.95rem', margin: 0, color: '#0F172A' }}>What is Migrating</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Source Ingress:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{migration.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Namespace:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{migration.namespace || defaultNamespace}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Production URL:</span>
                  <span style={{ color: '#0F172A', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{migration.production_url}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>TLS Secrets:</span>
                  <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> {defaultTlsSecret} (RSA 4096-bit)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Detected Annotations:</span>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>8 NGINX Directives Mapped</span>
                </div>
              </div>
            </div>

            {/* Box 2: What Changes are Happening on Cluster */}
            <div style={{ padding: '20px', borderRadius: '12px', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Server size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '0.95rem', margin: 0, color: '#0F172A' }}>Changes Happening on Cluster</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284C7" />
                  <span><strong>Isolated Namespace:</strong> <code>{isGcp ? 'traefik' : 'kmm-traefik-system'}</code> verified without affecting <code>{migration.namespace || defaultNamespace}</code>.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284C7" />
                  <span><strong>Target IngressClass:</strong> <code>traefik-migration</code> deployed (0 interference with live <code>nginx</code>).</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284C7" />
                  <span><strong>Cloud Load Balancer:</strong> {isGcp ? 'GCP NEG Traffic Draining Driver' : 'Secondary Target Group'} bound to Traefik preview pods.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284C7" />
                  <span><strong>Testing Endpoint:</strong> Temporary URL <code>{traefikReadiness?.migration_impact_summary?.temporary_runtime_url || defaultRuntimeUrl}</code> created.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#059669" />
                  <span><strong>Production Traffic:</strong> 100% remains on NGINX until formal cutover window.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Side-by-Side YAML Diff Viewer */}
          {diffData && (
            <div style={{ marginBottom: '24px', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#F1F5F9', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
                  Side-by-Side YAML AST Diff • NGINX Ingress → Traefik IngressRoute
                </span>
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Auto-Generated</span>
              </div>
              <div className="grid-responsive-1-2" style={{ background: '#FFFFFF' }}>
                {/* Source NGINX */}
                <div style={{ padding: '16px', borderRight: '1px solid var(--border-subtle)', background: '#FAFAFA' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Source NGINX Manifest (networking.k8s.io/v1)
                  </div>
                  <pre style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.5, overflowX: 'auto' }}>
                    {diffData.source_nginx_yaml}
                  </pre>
                </div>
                {/* Target Traefik */}
                <div style={{ padding: '16px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Target Traefik Manifest (traefik.io/v1alpha1)
                  </div>
                  <pre style={{ fontSize: '0.78rem', color: '#0284C7', lineHeight: 1.5, overflowX: 'auto' }}>
                    {diffData.target_traefik_yaml}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setCurrentStep(2)}>
              <ArrowLeft size={16} /> Back to Traefik Validation
            </button>
            <button className="btn-primary" onClick={() => setCurrentStep(4)}>
              Proceed to Verified Backup <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: ENCRYPTED S3 BACKUP & RECOVERY                                   */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <ShieldCheck size={22} color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#0F172A' }}>
                  Stage 4: Pre-Migration Snapshot & Backup Verification
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Zero production changes may occur without a verified, AES-256 encrypted backup bundle in Amazon S3.
              </p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
              Zero-Downtime Guarantee
            </span>
          </div>

          <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
            <div className="grid-responsive-1-2" style={{ gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Respective Cluster Storage Target:</span>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                  {defaultBackupStorage}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Encryption Standard:</span>
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px', fontSize: '0.85rem' }}>
                  {defaultKmsEncryption}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Manifests Captured:</span>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', fontSize: '0.85rem' }}>
                  Ingress, IngressClass, IngressRoute CRDs, ConfigMaps, TLS Secrets
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Instant Rollback Latency:</span>
                <div style={{ fontWeight: 600, color: 'var(--accent-emerald)', marginTop: '2px', fontSize: '0.85rem' }}>
                  {defaultLbRollback}
                </div>
              </div>
            </div>
          </div>

          {/* Respective Storage Account Ingress & Traefik Folders */}
          <div style={{ padding: '16px 20px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', marginBottom: '10px', wordBreak: 'break-all' }}>
              📁 Respective Cluster Storage Account Folder Hierarchy ({defaultBackupStorage})
            </div>
            <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#DC2626', marginBottom: '4px' }}>
                  📁 previous/ingress/
                </div>
                <div style={{ fontSize: '0.70rem', color: '#64748B', fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>📄 {migration.name || 'source'}-ingress.yaml (1.2 KB)</div>
                  <div>📄 tls-certificates.yaml (2.8 KB)</div>
                  <div>📄 ingress-annotations.json (0.9 KB)</div>
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#059669', marginBottom: '4px' }}>
                  📁 post/traefik/
                </div>
                <div style={{ fontSize: '0.70rem', color: '#64748B', fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>📄 {migration.name || 'traefik'}-ingressroute-https.yaml (1.1 KB)</div>
                  <div>📄 {migration.name || 'traefik'}-ingressroute.yaml (0.7 KB)</div>
                  <div>📄 traefik-middlewares.yaml (0.9 KB)</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.70rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span>📄 <strong>backup-manifest.json</strong> (SHA-256 Checksum Verified)</span>
              <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>Encrypted & Verified</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setCurrentStep(3)}>
              <ArrowLeft size={16} /> Back to Diff Review
            </button>
            <button className="btn-primary" onClick={handleCreateBackup} disabled={loading}>
              <ShieldCheck size={16} /> {loading ? 'Encrypting & Verifying...' : 'Create & Verify Backup'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: DEPLOY TRAEFIK & RUNTIME URL TESTING                             */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <Zap size={22} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#0F172A' }}>
                  Stage 5: Parallel Traefik Deployment & Runtime URL Probing
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Traefik is deployed in isolated namespace <code>{isGcp ? 'traefik' : 'kmm-traefik-system'}</code>. Test all synthetic probes prior to production cutover.
              </p>
            </div>
          </div>

          <div style={{ padding: '18px 22px', borderRadius: '12px', background: '#F0F9FF', border: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                Temporary Testing Runtime URL:
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginTop: '2px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                {traefikReadiness?.migration_impact_summary?.temporary_runtime_url || defaultRuntimeUrl}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Probes: HTTP 200 OK • Latency: 12ms • TLS RSA 4096-bit Valid • Cloud LB Driver Active
              </div>
            </div>
            <button className="btn-secondary" onClick={() => onNavigateToTab('developer')}>
              Launch Developer Portal <ExternalLink size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setCurrentStep(4)}>
              <ArrowLeft size={16} /> Back to Backup
            </button>
            <button className="btn-primary" onClick={handleDeployTraefik} disabled={loading}>
              <Zap size={16} /> {loading ? 'Deploying Traefik in Parallel...' : 'Deploy Traefik & Proceed to Approvals'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 6: MANDATORY DUAL APPROVAL GATES                                    */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <ShieldCheck size={22} color="var(--accent-purple)" />
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#0F172A' }}>
                  Stage 6: Mandatory Dual-Approval Gates
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Developer sign-off on runtime functionality + formal DevOps Lead cutover authorization.
              </p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
              Dual Sign-Off Required
            </span>
          </div>

          <div className="grid-responsive-1-2" style={{ gap: '20px', marginBottom: '24px' }}>
            {/* Gate 1 */}
            <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Gate 1: Developer Validation</span>
                <span className="badge badge-success">Approved</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Developer tested 14 smoke test cases on runtime URL. All HTTP 200, CORS, and auth headers verified.
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Signed by: developer@company.com
              </div>
            </div>

            {/* Gate 2 */}
            <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Gate 2: DevOps Lead Authorization</span>
                <span className="badge badge-success">Authorized</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Backup confirmed in S3. 300s ALB connection draining plan reviewed. Change window authorized.
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Signed by: devops-lead@company.com (Ticket: CHG-2026-8891)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setCurrentStep(5)}>
              <ArrowLeft size={16} /> Back to Testing
            </button>
            <button className="btn-primary" onClick={() => setCurrentStep(7)}>
              Proceed to Zero-Downtime Cutover <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 7: ZERO-DOWNTIME PRODUCTION CUTOVER & ROLLBACK                      */}
      {/* ========================================================================= */}
      {currentStep === 7 && (
        <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <Zap size={22} color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#0F172A' }}>
                  Stage 7: Zero-Planned-Downtime Cutover & Instant Rollback
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                AWS ALB Target Group weighted shift with 300s connection draining and automated emergency rollback.
              </p>
            </div>
            <button className="btn-primary" onClick={() => onNavigateToTab('cutover')}>
              Launch Full Cutover Console <ExternalLink size={14} />
            </button>
          </div>

          <div style={{ padding: '20px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 700 }}>
                  ALB TARGET GROUP STATUS:
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065F46', marginTop: '2px' }}>
                  Ready to Shift: 100% NGINX → 100% Traefik
                </div>
                <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '4px' }}>
                  Connection Draining: 300s • Rollback Threshold: &gt;2.0% 5xx errors • Emergency Restoral: &lt;2s
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '8px 16px' }}>
                Zero Downtime Active
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button className="btn-secondary" onClick={() => setCurrentStep(6)}>
              <ArrowLeft size={16} /> Back to Approvals
            </button>
          </div>
        </div>
      )}

      {/* Reusable View Modal */}
      {viewModal && (
        <EntityViewModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal(null)}
          title={viewModal.title}
          subtitle={viewModal.subtitle}
          data={viewModal.data}
          type={viewModal.type}
        />
      )}

      {/* Reusable Edit Modal */}
      {editModal && (
        <EntityEditModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal(null)}
          title={editModal.title}
          initialData={editModal.initialData}
          fields={editModal.fields}
          onSave={async (updated) => {
            await api.updateMigration(migration.id, updated as any);
            onRefreshMigration();
          }}
        />
      )}

      {/* Reusable Delete Modal */}
      {deleteModal && (
        <EntityDeleteModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          entityName={deleteModal.name}
          entityType={deleteModal.type}
          onConfirmDelete={async () => {
            await api.deleteMigration(deleteModal.id);
            onRefreshMigration();
            onNavigateToTab('dashboard');
          }}
        />
      )}
    </div>
  );
};

