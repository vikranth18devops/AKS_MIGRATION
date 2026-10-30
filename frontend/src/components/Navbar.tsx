import React from 'react';
import { Layers, ShieldCheck, Activity, Terminal, ExternalLink } from 'lucide-react';

interface NavbarProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange }) => {
  return (
    <header className="glass-panel" style={{ margin: '16px 24px', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
        }}>
          <Layers size={22} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #FFFFFF, #94A3B8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Kubernetes Migration Manager
            </h1>
            <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>v2.0 EKS</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
            Zero-Planned-Downtime Traffic Orchestration • NGINX → Traefik
          </p>
        </div>
      </div>

      {/* Cluster & Live Health Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}>
          <div className="pulsing-dot" />
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#34D399' }}>Live Infrastructure</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>| eks-production</span>
        </div>

        {/* Role Switcher for Pair-Programming & Multi-Role Demo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role:</span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value)}
            style={{
              background: '#1E293B',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="DEVOPS_ENGINEER">DevOps Engineer (Owner)</option>
            <option value="DEVELOPER">Developer (Tester)</option>
            <option value="DEVOPS_LEAD">DevOps Lead (Approver)</option>
            <option value="AUDITOR">Auditor (Compliance)</option>
          </select>
        </div>
      </div>
    </header>
  );
};
