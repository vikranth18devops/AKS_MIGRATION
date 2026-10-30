import React, { useState } from 'react';
import { Cluster, DiscoveredIngress } from '../types';
import { api } from '../services/api';
import { Layers, Zap, X, ArrowRight } from 'lucide-react';

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
  const [name, setName] = useState<string>(
    initialIngress ? `${initialIngress.name} Traefik Migration` : 'Checkout Service Ingress Migration'
  );
  const [clusterId, setClusterId] = useState<string>(initialClusterId || clusters[0]?.id || '');
  const [namespace, setNamespace] = useState<string>(initialIngress?.namespace || 'production-apps');
  const [applicationName, setApplicationName] = useState<string>(
    initialIngress ? initialIngress.name.replace('-ingress', '') : 'checkout-service'
  );
  const [productionUrl, setProductionUrl] = useState<string>(
    initialIngress?.hosts[0] ? `https://${initialIngress.hosts[0]}` : 'https://checkout.company.com'
  );
  const [targetController, setTargetController] = useState<string>('TRAEFIK');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      <div className="glass-panel" style={{ width: '560px', padding: '28px', background: '#0D131F' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Create Ingress Migration Project</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automated NGINX to Gateway transition workflow</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Kubernetes Cluster
              </label>
              <select
                value={clusterId}
                onChange={(e) => setClusterId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
              >
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.cloud_provider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Target Controller
              </label>
              <select
                value={targetController}
                onChange={(e) => setTargetController(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1E293B', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
              >
                <option value="TRAEFIK">Traefik v3.0 (Recommended)</option>
                <option value="ENVOY_GATEWAY">Envoy Gateway (Gateway API)</option>
                <option value="ISTIO_GATEWAY">Istio Gateway</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Namespace
              </label>
              <input
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                Application Service
              </label>
              <input
                type="text"
                value={applicationName}
                onChange={(e) => setApplicationName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
              Current Production URL
            </label>
            <input
              type="text"
              value={productionUrl}
              onChange={(e) => setProductionUrl(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#FFFFFF', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Project...' : 'Initialize Migration'} <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
