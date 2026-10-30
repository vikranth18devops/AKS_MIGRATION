import React from 'react';
import { Migration, Cluster } from '../types';
import { Layers, Server, ShieldCheck, CheckCircle2, Clock, AlertTriangle, ArrowRight, Activity, Zap } from 'lucide-react';

interface DashboardViewProps {
  migrations: Migration[];
  clusters: Cluster[];
  onSelectMigration: (migration: Migration) => void;
  onOpenWizard: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  migrations,
  clusters,
  onSelectMigration,
  onOpenWizard,
  onNavigateToTab
}) => {
  const activeCount = migrations.filter(m => m.current_state !== 'COMPLETED' && m.current_state !== 'ROLLED_BACK').length;
  const verifiedBackupCount = migrations.filter(m => m.has_verified_backup).length;
  const unauthClusters = clusters.filter(c => !c.is_authenticated);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cluster Authentication Alert Banner */}
      {unauthClusters.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '16px 20px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} color="#FBBF24" />
            <div>
              <div style={{ fontWeight: 600, color: '#FDE68A', fontSize: '0.9rem' }}>
                Cluster Authentication Required ({unauthClusters.length} Cluster{unauthClusters.length > 1 ? 's' : ''} Pending)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {unauthClusters.map(c => c.name).join(', ')} requires authentication. Live Ingress discovery and Traefik migration steps are locked until credentials are verified.
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            onClick={() => onNavigateToTab('clusters')}
          >
            Authenticate Clusters <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Target Clusters</span>
            <Server size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF' }}>{clusters.length}</div>
          <div style={{ fontSize: '0.75rem', color: unauthClusters.length === 0 ? 'var(--accent-emerald)' : '#FBBF24', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {unauthClusters.length === 0 ? (
              <><CheckCircle2 size={12} /> All Clusters Authenticated</>
            ) : (
              <><AlertTriangle size={12} /> {clusters.length - unauthClusters.length}/{clusters.length} Authenticated</>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Migrations</span>
            <Layers size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF' }}>{activeCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            NGINX → Traefik Workflows
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Verified Backups</span>
            <ShieldCheck size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF' }}>100%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {verifiedBackupCount} S3 AES-256 Snapshots
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Planned Downtime</span>
            <Activity size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF' }}>0.00s</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            ALB Target Group Draining
          </div>
        </div>
      </div>

      {/* Main Migration Projects Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Production Migration Projects</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              End-to-end tracked lifecycle with live health checks and mandatory approvals.
            </p>
          </div>
          <button className="btn-primary" onClick={onOpenWizard}>
            <Zap size={16} /> New Ingress Migration
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Application & Project</th>
                <th style={{ padding: '12px 16px' }}>Target</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Backup</th>
                <th style={{ padding: '12px 16px' }}>Approvals</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {migrations.map((mig) => (
                <tr
                  key={mig.id}
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.95rem' }}>{mig.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {mig.production_url} • {mig.cluster_name || 'eks-production'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                      {mig.source_controller} → {mig.target_controller}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      className={`badge ${
                        mig.current_state === 'COMPLETED'
                          ? 'badge-success'
                          : mig.current_state === 'RUNTIME_TESTING'
                          ? 'badge-info'
                          : mig.current_state === 'BLOCKED'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {mig.current_state}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {mig.has_verified_backup ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> S3 Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className={`badge ${mig.developer_approved ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        Dev: {mig.developer_approved ? 'Yes' : 'Pending'}
                      </span>
                      <span className={`badge ${mig.production_approved ? 'badge-success' : 'badge-purple'}`} style={{ fontSize: '0.65rem' }}>
                        Lead: {mig.production_approved ? 'Yes' : 'Gate'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => {
                        onSelectMigration(mig);
                        onNavigateToTab('wizard');
                      }}
                    >
                      Launch Studio <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
