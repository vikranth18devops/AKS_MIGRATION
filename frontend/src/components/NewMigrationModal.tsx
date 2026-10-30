import React, { useState } from 'react';
import { Cluster, DiscoveredIngress } from '../types';
import { api } from '../services/api';
import { Layers, Zap, X, ArrowRight, Lock, CheckCircle2, Key, ShieldAlert } from 'lucide-react';

interface NewMigrationModalProps {
  clusters: Cluster[];
  initialClusterId?: string;
  initialIngress?: DiscoveredIngress | null;
  onClose: () => void;
  onSuccess: (newMigrationId: string) => void;
}

export const NewMigrationModal: React.FC<NewMigrationModalProps> = ({
  clusters,
  initialClusterId,
  initialIngress,
  onClose,
  onSuccess
}) => {
  const [clusterId, setClusterId] = useState<string>(initialClusterId || clusters[0]?.id || '');
  const selectedCluster = clusters.find((c) => c.id === clusterId) || clusters[0];
  const isClusterAuthenticated = selectedCluster?.is_authenticated ?? false;

  const [name, setName] = useState<string>(
    initialIngress ? `${initialIngress.name} Traefik Migration` : 'Checkout Service Ingress Migration'
  );
  const [namespace, setNamespace] = useState<string>(initialIngress?.namespace || 'production-apps');
  const [applicationName, setApplicationName] = useState<string>(
    initialIngress ? initialIngress.name.replace('-ingress', '') : 'checkout-service'
  );
  const [productionUrl, setProductionUrl] = useState<string>(
    initialIngress?.hosts[0] ? `https://${initialIngress.hosts[0]}` : 'https://checkout.company.com'
  );
  const [targetController, setTargetController] = useState<string>('TRAEFIK');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline Authentication State
  const [authMethod, setAuthMethod] = useState<string>(selectedCluster?.auth_method || 'AWS_IAM_ROLE');
  const [authRoleArn, setAuthRoleArn] = useState<string>('arn:aws:iam::123456789012:role/kmm-eks-migration-role');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  const handleAuthenticateCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCluster) return;
    setIsAuthenticating(true);
    setErrorMsg(null);
    try {
      const res = await api.authenticateCluster(selectedCluster.id, {
        auth_method: authMethod,
        role_arn: authRoleArn,
        token: authToken
      });
      selectedCluster.is_authenticated = true;
      selectedCluster.auth_method = authMethod;
      setAuthSuccessMsg(`Cluster '${selectedCluster.name}' authenticated. Ingress items unlocked.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Cluster authentication failed. Please verify credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClusterAuthenticated) {
      setErrorMsg('Cluster authentication is strictly required before initializing migration.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const created = await api.createMigration({
        name,
        cluster_id: clusterId,
        namespace,
        application_name: applicationName,
        production_url: productionUrl,
        target_controller: targetController
      });
      onSuccess(created.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize migration. Ensure cluster is authenticated.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}
    >
      <div className="glass-panel" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', background: '#0D131F' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Create Ingress Migration Project</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automated NGINX to Traefik transition workflow</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} color="#F87171" />
            <span style={{ fontSize: '0.8rem', color: '#FCA5A5' }}>{errorMsg}</span>
          </div>
        )}

        {authSuccessMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.8rem', color: '#A7F3D0' }}>{authSuccessMsg}</span>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
            Target Kubernetes Cluster
          </label>
          <select
            value={clusterId}
            onChange={(e) => {
              setClusterId(e.target.value);
              setAuthSuccessMsg(null);
              setErrorMsg(null);
            }}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
          >
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cloud_provider}) — {c.is_authenticated ? '✓ AUTHENTICATED' : '🔒 AUTH REQUIRED'}
              </option>
            ))}
          </select>
        </div>

        {/* CLUSTER AUTHENTICATION GATE IF UNHEALTHY / UNAUTHENTICATED */}
        {!isClusterAuthenticated ? (
          <div
            style={{
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: 'rgba(245, 158, 11, 0.05)',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Lock size={18} color="#FBBF24" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#FDE68A' }}>
                Cluster Authentication Required for {selectedCluster?.name}
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '14px' }}>
              Before initiating migration to Traefik, you must authenticate cluster credentials. Necessary Ingress configurations and routing rules will only be displayed and editable after authentication.
            </p>

            <form onSubmit={handleAuthenticateCluster} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Authentication Mechanism
                </label>
                <select
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#0F172A', border: '1px solid var(--border-subtle)', color: '#FFFFFF', fontSize: '0.8rem' }}
                >
                  <option value="AWS_IAM_ROLE">AWS IAM Role (EKS IRSA / Pod Identity)</option>
                  <option value="AZURE_WORKLOAD_IDENTITY">Azure Workload Identity (AKS)</option>
                  <option value="SERVICE_ACCOUNT_TOKEN">Kubernetes Service Account Bearer Token</option>
                  <option value="OIDC_KUBECONFIG">OIDC / Bearer Token Kubeconfig</option>
                </select>
              </div>

              {authMethod === 'AWS_IAM_ROLE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    IAM Role ARN
                  </label>
                  <input
                    type="text"
                    value={authRoleArn}
                    onChange={(e) => setAuthRoleArn(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#0F172A', border: '1px solid var(--border-subtle)', color: '#FFFFFF', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
              )}

              {authMethod === 'SERVICE_ACCOUNT_TOKEN' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Service Account Token
                  </label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="eyJhbGciOiJSUzI1NiIs..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#0F172A', border: '1px solid var(--border-subtle)', color: '#FFFFFF', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ justifyContent: 'center', marginTop: '4px', padding: '8px 12px', fontSize: '0.8rem' }}
                disabled={isAuthenticating}
              >
                <Key size={14} /> {isAuthenticating ? 'Authenticating & Verifying RBAC...' : 'Authenticate Cluster & Unlock Ingress Form'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.8rem', color: '#A7F3D0', fontWeight: 600 }}>
                {selectedCluster?.name} Authenticated via {selectedCluster?.auth_method || 'AWS IAM Role'}
              </span>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>RBAC Verified</span>
          </div>
        )}

        {/* INGRESS SPECIFICATIONS FORM (LOCKED UNTIL AUTHENTICATED) */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', opacity: isClusterAuthenticated ? 1 : 0.4 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isClusterAuthenticated}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Target Controller
              </label>
              <select
                value={targetController}
                onChange={(e) => setTargetController(e.target.value)}
                disabled={!isClusterAuthenticated}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
              >
                <option value="TRAEFIK">Traefik v3.0 (Recommended)</option>
                <option value="ENVOY_GATEWAY">Envoy Gateway (Gateway API)</option>
                <option value="ISTIO_GATEWAY">Istio Gateway</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Namespace
              </label>
              <input
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                disabled={!isClusterAuthenticated}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Application Service
              </label>
              <input
                type="text"
                value={applicationName}
                onChange={(e) => setApplicationName(e.target.value)}
                disabled={!isClusterAuthenticated}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Current Production URL
              </label>
              <input
                type="text"
                value={productionUrl}
                onChange={(e) => setProductionUrl(e.target.value)}
                disabled={!isClusterAuthenticated}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !isClusterAuthenticated}
              title={!isClusterAuthenticated ? 'Cluster authentication required first' : ''}
            >
              {loading ? 'Creating Project...' : !isClusterAuthenticated ? '🔒 Authenticate Cluster First' : 'Initialize Migration'} <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
