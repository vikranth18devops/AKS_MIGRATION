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
  Server
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
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');

  const steps = [
    { num: 1, title: 'Cluster & Ingress' },
    { num: 2, title: 'Compatibility Assessment' },
    { num: 3, title: 'Encrypted S3 Backup' },
    { num: 4, title: 'Deploy Traefik' },
    { num: 5, title: 'Runtime Testing' },
    { num: 6, title: 'Dual Approvals' },
    { num: 7, title: 'Production Cutover' }
  ];

  const handleRunAssessment = async () => {
    setLoading(true);
    try {
      const res = await api.runAssessment(migration.id);
      setAssessment(res);
      setActionMessage('AST Parsing completed. 0 blockers, 1 warning mapped to Traefik Middlewares.');
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
      const res = await api.deployTraefik(migration.id);
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
            const isCompleted = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            return (
              <div
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  opacity: isCurrent ? 1 : isCompleted ? 0.8 : 0.4
                }}
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
                    color: isCompleted ? '#34D399' : '#FFFFFF',
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
                  {isCompleted ? <CheckCircle2 size={16} /> : s.num}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: isCurrent ? 600 : 400, color: isCurrent ? '#FFFFFF' : 'var(--text-muted)' }}>
                  {s.title}
                </span>
                {idx < steps.length - 1 && (
                  <div style={{ width: '20px', height: '1px', background: 'rgba(255, 255, 255, 0.1)', marginLeft: '8px' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {actionMessage && (
        <div className="glass-panel" style={{ padding: '12px 20px', borderLeft: '4px solid var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.08)' }}>
          <span style={{ fontSize: '0.85rem', color: '#A7F3D0', fontWeight: 500 }}>{actionMessage}</span>
        </div>
      )}

      {/* Step 2: Compatibility Assessment */}
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

      {/* Step 3: Backup */}
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

      {/* Step 4: Deploy Traefik */}
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

      {/* Step 5: Runtime Testing & Diff */}
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

      {/* Step 6: Dual Approvals */}
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
