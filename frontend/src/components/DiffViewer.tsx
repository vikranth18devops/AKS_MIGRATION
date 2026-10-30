import React, { useEffect, useState } from 'react';
import { DiffData } from '../types';
import { api } from '../services/api';
import { FileCode, CheckCircle2, ArrowRight } from 'lucide-react';

interface DiffViewerProps {
  migrationId: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ migrationId }) => {
  const [diff, setDiff] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getDiff(migrationId).then((res) => {
      setDiff(res);
      setLoading(false);
    });
  }, [migrationId]);

  if (loading || !diff) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading configuration diff...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Configuration Difference & Mapping Engine</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Side-by-side comparison between source NGINX Ingress and generated Traefik IngressRoute/Middlewares.
            </p>
          </div>
          <span className="badge badge-purple">Version v1.0</span>
        </div>

        {/* Change Directives Pill Highlights */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {diff.changed_directives_summary.map((summary, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={12} /> {summary}
            </div>
          ))}
        </div>

        {/* Side-by-Side Editor Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Source NGINX */}
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#070A11' }}>
            <div style={{ padding: '10px 16px', background: '#0E131F', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F87171' }}>Source: NGINX Ingress YAML</span>
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#F87171', fontSize: '0.65rem' }}>Legacy</span>
            </div>
            <pre style={{ padding: '16px', fontSize: '0.78rem', color: '#CBD5E1', overflowX: 'auto', lineHeight: 1.5 }}>
              {diff.source_nginx_yaml}
            </pre>
          </div>

          {/* Target Traefik */}
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-highlight)', background: '#070A11' }}>
            <div style={{ padding: '10px 16px', background: '#0E1726', borderBottom: '1px solid var(--border-highlight)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Target: Traefik IngressRoute & Middleware</span>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Traefik v3.0</span>
            </div>
            <pre style={{ padding: '16px', fontSize: '0.78rem', color: '#E2E8F0', overflowX: 'auto', lineHeight: 1.5 }}>
              {diff.target_traefik_yaml}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
