import React, { useState } from 'react';
import { Cluster, DiscoveredIngress } from '../types';
import { api } from '../services/api';
import { Server, CheckCircle2, ShieldCheck, Plus, RefreshCw, Layers, ArrowUpRight, Globe, Lock, Search } from 'lucide-react';

interface ClusterExplorerViewProps {
  clusters: Cluster[];
  onRefreshClusters: () => void;
  onInitiateMigration: (clusterId: string, ingress: DiscoveredIngress) => void;
}

export const ClusterExplorerView: React.FC<ClusterExplorerViewProps> = ({
  clusters,
  onRefreshClusters,
  onInitiateMigration
}) => {
  const [selectedCluster, setSelectedCluster] = useState<Cluster>(clusters[0]);
  const [ingresses, setIngresses] = useState<DiscoveredIngress[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Register Form State
  const [newClusterName, setNewClusterName] = useState<string>('eks-payments-us-east-2');
  const [newCloudProvider, setNewCloudProvider] = useState<string>('AWS');
  const [newEnvironment, setNewEnvironment] = useState<string>('production');
  const [newApiEndpoint, setNewApiEndpoint] = useState<string>('https://B9C8D7E6F5.gr7.us-east-2.eks.amazonaws.com');
  const [newRoleArn, setNewRoleArn] = useState<string>('arn:aws:iam::123456789012:role/kmm-eks-migration-role');
  const [testResult, setTestResult] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedCluster) {
      loadIngresses(selectedCluster.id);
    }
  }, [selectedCluster]);

  const loadIngresses = async (clusterId: string) => {
    setLoading(true);
    const data = await api.getDiscoveredIngresses(clusterId);
    setIngresses(data);
    setLoading(false);
  };

  const handleTestConnection = async () => {
    setLoading(true);
    const res = await api.testClusterConnection(selectedCluster.id);
    setTestResult(res.message);
    setLoading(false);
  };

  const handleRegisterCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.registerCluster({
      name: newClusterName,
      cloud_provider: newCloudProvider,
      environment: newEnvironment,
      api_endpoint: newApiEndpoint,
      auth_method: 'AWS_IAM_ROLE',
      role_arn: newRoleArn
    });
    setShowRegisterModal(false);
    onRefreshClusters();
  };

  const filteredIngresses = ingresses.filter(
    (ing) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ing.hosts.some((h) => h.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Cluster Tabs */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Kubernetes Cluster Management & Live Explorer</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Inspect live NGINX Ingress resources, IngressClasses, backend services, and validate connectivity.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={handleTestConnection} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Test Connectivity
            </button>
            <button className="btn-primary" onClick={() => setShowRegisterModal(true)}>
              <Plus size={16} /> Register Cluster
            </button>
          </div>
        </div>

        {testResult && (
          <div className="glass-panel" style={{ padding: '12px 18px', borderLeft: '4px solid var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.08)', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem', color: '#A7F3D0', fontWeight: 600 }}>{testResult}</span>
          </div>
        )}

        {/* Cluster Selection Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {clusters.map((c) => {
            const isSelected = selectedCluster?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCluster(c)}
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#FFFFFF' : 'var(--text-main)' }}>
                    {c.name}
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                    {c.cloud_provider}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {c.api_endpoint.slice(0, 42)}...
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{c.kubernetes_version}</span>
                  <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> {c.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discovered Ingress Resources Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>
              Live Discovered Ingress Inventory • {selectedCluster?.name}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Discovered {filteredIngresses.length} NGINX Ingress resources across {selectedCluster?.namespaces_count} namespaces.
            </p>
          </div>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search host or ingress name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Ingress Resource</th>
                <th style={{ padding: '12px 16px' }}>Namespace</th>
                <th style={{ padding: '12px 16px' }}>Hosts & Routing Rules</th>
                <th style={{ padding: '12px 16px' }}>TLS Secrets</th>
                <th style={{ padding: '12px 16px' }}>Annotations</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Migration Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngresses.map((ing) => (
                <tr key={ing.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.9rem' }}>{ing.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Backends: {ing.backend_services.join(', ')}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                      {ing.namespace}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {ing.hosts.map((h, h_idx) => (
                        <div key={h_idx} style={{ fontSize: '0.825rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          https://{h}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={12} color="var(--accent-emerald)" />
                      {ing.tls_secrets.join(', ')}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {ing.annotations_count} Annotations
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                      onClick={() => onInitiateMigration(selectedCluster.id, ing)}
                    >
                      Migrate to Traefik <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Cluster Modal */}
      {showRegisterModal && (
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
          <div className="glass-panel" style={{ width: '540px', padding: '28px', background: '#0D131F' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Register Kubernetes Cluster</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Connect an AWS EKS, Azure AKS, or GCP GKE cluster via Workload Identity / IAM Roles.
            </p>

            <form onSubmit={handleRegisterCluster} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Cluster Name
                </label>
                <input
                  type="text"
                  value={newClusterName}
                  onChange={(e) => setNewClusterName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Cloud Provider
                  </label>
                  <select
                    value={newCloudProvider}
                    onChange={(e) => setNewCloudProvider(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
                  >
                    <option value="AWS">AWS EKS</option>
                    <option value="Azure">Azure AKS</option>
                    <option value="GCP">Google Cloud GKE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Environment
                  </label>
                  <select
                    value={newEnvironment}
                    onChange={(e) => setNewEnvironment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Kubernetes API Endpoint
                </label>
                <input
                  type="text"
                  value={newApiEndpoint}
                  onChange={(e) => setNewApiEndpoint(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  AWS IAM Role ARN (EKS IRSA / Pod Identity)
                </label>
                <input
                  type="text"
                  value={newRoleArn}
                  onChange={(e) => setNewRoleArn(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Connect & Validate Cluster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
