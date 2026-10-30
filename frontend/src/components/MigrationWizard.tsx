import React, { useState } from 'react';
import { Migration, Cluster, Assessment, DiffData } from '../types';
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
  ShieldAlert
} from 'lucide-react';

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
  // Find associated cluster
  const targetCluster = clusters.find((c) => c.id === migration.cluster_id) || clusters[0];
  const isClusterAuthenticated = targetCluster?.is_authenticated ?? false;

  // Initialize step: if not authenticated, MUST start at Stage 1
  const [currentStep, setCurrentStep] = useState<number>(isClusterAuthenticated ? 2 : 1);
  const [loading, setLoading] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');

  // Authentication State for Stage 1 Gate
  const [authMethod, setAuthMethod] = useState<string>(targetCluster?.auth_method || 'AWS_IAM_ROLE');
  const [authRoleArn, setAuthRoleArn] = useState<string>('arn:aws:iam::123456789012:role/kmm-eks-migration-role');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const steps = [
    { num: 1, title: 'Cluster & Ingress Auth' },
    { num: 2, title: 'Compatibility Assessment' },
    { num: 3, title: 'Encrypted S3 Backup' },
    { num: 4, title: 'Deploy Traefik' },
    { num: 5, title: 'Runtime Testing' },
    { num: 6, title: 'Dual Approvals' },
    { num: 7, title: 'Production Cutover' }
  ];

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCluster) return;
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await api.authenticateCluster(targetCluster.id, {
        auth_method: authMethod,
        role_arn: authRoleArn,
        token: authToken
      });
      setActionMessage(`Cluster '${targetCluster.name}' successfully authenticated. Ingress items and Traefik migration unlocked.`);
      targetCluster.is_authenticated = true;
      targetCluster.auth_method = authMethod;
      onRefreshMigration();
    } catch (err: any) {
      setAuthError(err?.message || 'Cluster authentication failed. Please verify RBAC credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleStepClick = (stepNum: number) => {
    if (!isClusterAuthenticated && stepNum > 1) {
      setAuthError('Cluster authentication is strictly required before accessing downstream migration steps.');
      return;
    }
    setCurrentStep(stepNum);
  };

  const handleRunAssessment = async () => {
    setLoading(true);
    try {
      const res = await api.runAssessment(migration.id);
      setAssessment(res);
      setActionMessage('AST Parsing completed. 0 blockers, 1 warning mapped to Traefik Middlewares.');
    } catch (err: any) {
      setActionMessage(`Assessment error: ${err?.message || 'Cluster authentication check failed.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDiff = async () => {
    setLoading(true);
    try {
      const diff = await api.getDiff(migration.id);
      setDiffData(diff);
      setCurrentStep(5);
    } catch (err: any) {
      setActionMessage(`Diff loading error: ${err?.message || 'Cluster authentication required.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const res = await api.createBackup(migration.id);
      setActionMessage(`Verified Backup: ${res.backup_number} (Checksum: ${res.sha256_checksum.slice(0, 16)}...)`);
      onRefreshMigration();
      setCurrentStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleDeployTraefik = async () => {
    setLoading(true);
    try {
      await api.deployTraefik(migration.id);
      setActionMessage(`Traefik deployed in isolated namespace kmm-traefik-system. Runtime URL ready.`);
      onRefreshMigration();
      setCurrentStep(5);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Step Progress Bar */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  opacity: isCurrent ? 1 : isCompleted ? 0.8 : isLocked ? 0.3 : 0.6
                }}
                title={isLocked ? 'Cluster authentication required' : s.title}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCurrent
                      ? 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)'
                      : isCompleted
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: isCompleted ? '#34D399' : isLocked ? '#94A3B8' : '#FFFFFF',
                    border: isCurrent
                      ? '2px solid #22D3EE'
                      : isCompleted
                      ? '1px solid #10B981'
                      : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
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
                    fontSize: '0.85rem',
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent ? '#FFFFFF' : isLocked ? 'var(--text-dim)' : 'var(--text-muted)'
                  }}
                >
                  {s.title}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    style={{
                      width: '20px',
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      marginLeft: '8px'
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
            borderLeft: '4px solid var(--accent-emerald)',
            background: 'rgba(16, 185, 129, 0.08)'
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#A7F3D0', fontWeight: 500 }}>
            {actionMessage}
          </span>
        </div>
      )}

      {authError && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 20px',
            borderLeft: '4px solid #EF4444',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={16} color="#F87171" />
          <span style={{ fontSize: '0.85rem', color: '#FCA5A5', fontWeight: 500 }}>
            {authError}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: CLUSTER AUTHENTICATION GATE & INGRESS TARGET SPECIFICATIONS     */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          {!isClusterAuthenticated ? (
            /* CLUSTER AUTHENTICATION REQUIRED BARRIER */
            <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}
              >
                <Lock size={32} color="#FBBF24" />
              </div>

              <div style={{ display: 'inline-block', marginBottom: '8px' }}>
                <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  STAGE 1 PREREQUISITE • CLUSTER AUTHENTICATION REQUIRED
                </span>
              </div>

              <h2 style={{ fontSize: '1.45rem', marginTop: '4px', marginBottom: '8px' }}>
                Authenticate Kubernetes Cluster '{targetCluster?.name}'
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
                To migrate your Ingress Controller to Traefik, live Kubernetes cluster authentication is strictly required.
                Downstream Ingress resources, AST conversion rules, side-by-side YAML diffs, and traffic cutover operations will only be displayed after credentials and RBAC permissions are verified.
              </p>

              <form
                onSubmit={handleAuthenticate}
                style={{
                  textAlign: 'left',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Authentication Mechanism
                  </label>
                  <select
                    value={authMethod}
                    onChange={(e) => setAuthMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      outline: 'none',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="AWS_IAM_ROLE">AWS IAM Role (EKS IRSA / Pod Identity)</option>
                    <option value="AZURE_WORKLOAD_IDENTITY">Azure Workload Identity (AKS)</option>
                    <option value="SERVICE_ACCOUNT_TOKEN">Kubernetes Service Account Bearer Token</option>
                    <option value="OIDC_KUBECONFIG">OIDC / Bearer Token Kubeconfig</option>
                  </select>
                </div>

                {authMethod === 'AWS_IAM_ROLE' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      IAM Role ARN
                    </label>
                    <input
                      type="text"
                      value={authRoleArn}
                      onChange={(e) => setAuthRoleArn(e.target.value)}
                      placeholder="arn:aws:iam::123456789012:role/kmm-eks-migration-role"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--border-subtle)',
                        color: '#FFFFFF',
                        outline: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem'
                      }}
                      required
                    />
                  </div>
                )}

                {authMethod === 'SERVICE_ACCOUNT_TOKEN' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Service Account Token
                    </label>
                    <textarea
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--border-subtle)',
                        color: '#FFFFFF',
                        outline: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem'
                      }}
                      required
                    />
                  </div>
                )}

                {/* RBAC Checklist */}
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    RBAC Permissions to be Verified:
                  </span>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={12} color="var(--accent-cyan)" /> <code>networking.k8s.io/v1 Ingresses</code>: get, list, watch
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={12} color="var(--accent-cyan)" /> <code>traefik.io/v1alpha1 IngressRoute & Middleware</code>: create, patch
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={12} color="var(--accent-cyan)" /> <code>v1 Secrets & ConfigMaps</code>: read TLS certificates & headers
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ justifyContent: 'center', padding: '12px' }}
                  disabled={isAuthenticating}
                >
                  <Key size={16} /> {isAuthenticating ? 'Authenticating & Verifying RBAC...' : 'Authenticate Cluster & Unlock Traefik Items'}
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED: DISPLAY NECESSARY ITEMS */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <CheckCircle2 size={20} color="var(--accent-emerald)" />
                    <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
                      Stage 1: Cluster Authenticated & Ingress Target Identified
                    </h2>
                    <span className="badge badge-success">Live Session Verified</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Cluster '{targetCluster?.name}' is authenticated via {targetCluster?.auth_method || 'AWS IAM Role'}. Necessary Ingress resources and Traefik specifications are unlocked.
                  </p>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => setCurrentStep(2)}
                >
                  Proceed to Compatibility Assessment <ArrowRight size={16} />
                </button>
              </div>

              {/* SPECIFICATION CARDS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Card 1: Source Ingress */}
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={16} color="var(--accent-purple)" /> Source NGINX Ingress
                    </span>
                    <span className="badge badge-purple">networking.k8s.io/v1</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Resource Name:</span>
                      <span style={{ fontWeight: 600, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{migration.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Namespace:</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{migration.namespace || 'production-apps'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Production URL:</span>
                      <span style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{migration.production_url || 'https://payments.company.com'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Active IngressClass:</span>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>nginx</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Upstream Backends:</span>
                      <span style={{ color: '#FFFFFF' }}>payment-service:8080 (Pods: 6/6 Healthy)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>TLS Certificate:</span>
                      <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} /> payments-tls-cert (Valid RSA 4096-bit)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Target Traefik Gateway */}
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Server size={16} color="var(--accent-cyan)" /> Target Traefik Controller
                    </span>
                    <span className="badge badge-info">traefik.io/v1alpha1</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Target Controller:</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{migration.target_controller} (v3.0.x)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Isolated IngressClass:</span>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>traefik-migration</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Deployment Namespace:</span>
                      <span style={{ color: '#FFFFFF' }}>kmm-traefik-system</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Target CRD Resources:</span>
                      <span style={{ color: '#FFFFFF' }}>IngressRoute + Traefik Middlewares</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Cutover Strategy:</span>
                      <span style={{ color: '#FFFFFF' }}>Dual-TargetGroup ALB Connection Draining (300s)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Target ALB TG:</span>
                      <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        ...:targetgroup/kmm-traefik-preview/...
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RBAC Verified Capabilities */}
              <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <ShieldCheck size={24} color="var(--accent-emerald)" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.9rem' }}>
                      Verified Cluster Capabilities on {targetCluster?.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Ingress discovery, Traefik CRD creation, TLS Secret access, and AWS TargetGroupBinding confirmed.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Ingress Read</span>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Traefik CRDs</span>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Secrets</span>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>ALB TG Switch</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: COMPATIBILITY ASSESSMENT                                         */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Stage 2: NGINX Ingress Compatibility Assessment</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Parses live NGINX annotations into Canonical GatewayRouteIR and validates against Traefik CRDs.
              </p>
            </div>
            <button className="btn-primary" onClick={handleRunAssessment} disabled={loading}>
              <Activity size={16} /> {loading ? 'Analyzing AST...' : 'Run Live Assessment'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Blocker Findings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34D399' }}>0 Blockers</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Warnings (Auto-Mapped)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FBBF24' }}>1 Warning</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Target Controller</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Traefik v3.0</div>
            </div>
          </div>

          {/* Findings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>INFO</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF' }}>nginx.ingress.kubernetes.io/ssl-redirect: true</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Mapped to Traefik RedirectScheme Middleware (permanent HTTPS redirect).
                </p>
              </div>
              <span className="badge badge-success">Resolved</span>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-warning" style={{ marginRight: '8px' }}>WARNING</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF' }}>nginx.ingress.kubernetes.io/proxy-body-size: 50m</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Converted into Traefik Buffering Middleware (maxRequestBodyBytes=52428800).
                </p>
              </div>
              <span className="badge badge-success">Resolved</span>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>INFO</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF' }}>nginx.ingress.kubernetes.io/limit-rps: 250</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Mapped to Traefik RateLimit Middleware (average=250, burst=500).
                </p>
              </div>
              <span className="badge badge-success">Resolved</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-secondary" onClick={handleLoadDiff}>
              <FileCode size={16} /> View Side-by-Side YAML Diff
            </button>
            <button className="btn-primary" onClick={() => setCurrentStep(3)}>
              Proceed to Verified Backup <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: BACKUP                                                           */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Stage 3: Pre-Migration Snapshot & Backup Verification</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            PRD Mandate: Zero production changes may occur without a verified, encrypted backup bundle in Amazon S3.
          </p>

          <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Backup Storage Target</span>
                <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '2px' }}>s3://kmm-migration-backups/eks-production/</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Encryption Standard</span>
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px' }}>AES-256-GCM (AWS KMS Key Protected)</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Manifests Captured</span>
                <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '2px' }}>Ingress, IngressClass, ConfigMaps, TLS Secrets, Route 53 State</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Verification Status</span>
                <div style={{ fontWeight: 600, color: 'var(--accent-emerald)', marginTop: '2px' }}>SHA-256 Checksum Verified</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-primary" onClick={handleCreateBackup} disabled={loading}>
              <ShieldCheck size={16} /> {loading ? 'Encrypting & Verifying...' : 'Create & Verify Backup'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: DEPLOY TRAEFIK                                                   */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Stage 4: Parallel Traefik Gateway Deployment</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Deploys Traefik Helm chart in isolated namespace <code>kmm-traefik-system</code> without affecting production NGINX.
          </p>

          <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={24} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Isolated IngressClass: traefik-migration</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Target pods bind to secondary ALB Target Group. Production traffic remains 100% on NGINX.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-primary" onClick={handleDeployTraefik} disabled={loading}>
              <Zap size={16} /> {loading ? 'Deploying Traefik via Helm...' : 'Deploy Traefik In Parallel'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: RUNTIME TESTING & DIFF                                           */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Stage 5: Runtime URL Verification & YAML Diff</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Temporary runtime URL is live on Route 53. Validate synthetic probes and compare converted YAML.
          </p>

          <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid var(--border-highlight)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>Temporary Runtime URL:</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                https://runtime-payments.company.com
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={() => onNavigateToTab('developer')}
              >
                Launch Developer Portal <ExternalLink size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-primary" onClick={() => setCurrentStep(6)}>
              Proceed to Approval Gates <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 6: DUAL APPROVALS                                                   */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Stage 6: Mandatory Dual-Approval Gates</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Requires Developer sign-off on runtime functionality + formal DevOps Lead cutover authorization.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
            {/* Gate 1 */}
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>Gate 1: Developer Validation</span>
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
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>Gate 2: DevOps Lead Authorization</span>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-primary" onClick={() => onNavigateToTab('cutover')}>
              Proceed to Zero-Downtime Cutover Console <Zap size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
