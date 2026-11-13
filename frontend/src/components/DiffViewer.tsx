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
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: '#FFFFFF' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading configuration diff...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', color: '#0F172A', margin: 0 }}>
              Configuration Difference & Mapping Engine
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Side-by-side comparison between source NGINX Ingress and generated Traefik IngressRoute/Middlewares.
            </p>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>Version v1.0 Mapped</span>
        </div>

        {/* Change Directives Pill Highlights */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {diff.changed_directives_summary.map((summary, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '0.75rem',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                color: '#0369A1',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={13} color="#0284C7" /> {summary}
            </div>
          ))}
        </div>

        {/* Side-by-Side Editor Panels */}
        <div className="grid-responsive-1-2" style={{ gap: '16px' }}>
          {/* Source NGINX */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#F8FAFC', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 18px', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#DC2626' }}>Source: NGINX Ingress YAML</span>
              <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Legacy Controller</span>
            </div>
            <pre style={{ padding: '18px', fontSize: '0.8rem', color: '#334155', overflowX: 'auto', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
              {diff.source_nginx_yaml}
            </pre>
          </div>

          {/* Target Traefik */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #BAE6FD', background: '#F0F9FF', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 18px', background: '#E0F2FE', borderBottom: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0284C7' }}>Target: Traefik IngressRoute & Middleware</span>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Traefik v3.0</span>
            </div>
            <pre style={{ padding: '18px', fontSize: '0.8rem', color: '#0369A1', overflowX: 'auto', lineHeight: 1.5, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {diff.target_traefik_yaml}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
