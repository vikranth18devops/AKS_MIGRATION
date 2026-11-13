import React, { useState } from 'react';
import { Layers, ShieldCheck, Users, Lock, Menu } from 'lucide-react';
import { CloudLogo } from './CloudLogo';
import { UserAccessModal } from './UserAccessModal';

interface NavbarProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange, onToggleMobileMenu }) => {
  const [showUserAccessModal, setShowUserAccessModal] = useState<boolean>(false);

  const canManageAccess = currentRole === 'ADMIN' || currentRole === 'DEVOPS_LEAD';

  const roleStyles: Record<string, { label: string; badgeClass: string; color: string; bg: string; border: string }> = {
    ADMIN: { label: 'Platform Admin', badgeClass: 'badge-purple', color: '#9333EA', bg: '#FAF5FF', border: '#E9D5FF' },
    DEVOPS_LEAD: { label: 'DevOps Lead', badgeClass: 'badge-success', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DEVOPS_ENGINEER: { label: 'DevOps Engineer', badgeClass: 'badge-info', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
    DEVELOPER: { label: 'Developer', badgeClass: 'badge-warning', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    AUDITOR: { label: 'Auditor', badgeClass: '', color: '#475569', bg: '#F8FAFC', border: '#CBD5E1' }
  };

  const currentRoleStyle = roleStyles[currentRole] || roleStyles.DEVOPS_ENGINEER;

  return (
    <>
      <header className="glass-panel app-navbar-container">
        {/* Brand Identity & Mobile Menu Toggle */}
        <div className="navbar-brand-wrapper">
          {onToggleMobileMenu && (
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={onToggleMobileMenu}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
          )}

          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            flexShrink: 0
          }}>
            <Layers size={22} color="#FFFFFF" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="navbar-brand-title">
                Kubernetes Migration Manager
              </h1>
              <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>v2.0 Multi-Cloud</span>
            </div>
            <p className="navbar-brand-subtitle">
              Zero-Planned-Downtime Traffic Orchestration • NGINX Ingress → Traefik Gateway
            </p>
          </div>
        </div>

        {/* Cluster & Live Health Indicator and Actions */}
        <div className="navbar-actions-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: '#ECFDF5', border: '1px solid #A7F3D0', flexShrink: 0 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#047857' }}>Live:</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CloudLogo provider="AWS" size={14} />
              <CloudLogo provider="Azure" size={14} />
              <CloudLogo provider="GCP" size={14} />
              <CloudLogo provider="On-Premises" size={14} />
            </div>
          </div>

          {/* Manage User Access Button */}
          <button
            onClick={() => setShowUserAccessModal(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: canManageAccess ? '1px solid #7C3AED' : '1px dashed #CBD5E1',
              background: canManageAccess ? 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)' : '#F8FAFC',
              color: canManageAccess ? '#FFFFFF' : '#64748B',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: canManageAccess ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            title={canManageAccess ? 'Manage Platform Users, Roles & Permissions' : 'View Permissions Matrix (Admin / DevOps Lead only can modify)'}
          >
            {canManageAccess ? <Users size={14} /> : <Lock size={13} color="#94A3B8" />}
            <span>{canManageAccess ? 'Access & RBAC' : 'Access (View)'}</span>
          </button>

          {/* Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <ShieldCheck size={16} color={currentRoleStyle.color} />
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value)}
              aria-label="Current Role"
              style={{
                background: currentRoleStyle.bg,
                color: currentRoleStyle.color,
                border: `1px solid ${currentRoleStyle.border}`,
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                maxWidth: '180px'
              }}
            >
              <option value="ADMIN">Platform Admin</option>
              <option value="DEVOPS_LEAD">DevOps Lead</option>
              <option value="DEVOPS_ENGINEER">DevOps Engineer</option>
              <option value="DEVELOPER">Developer</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>
        </div>
      </header>

      {/* User Access & Roles Modal */}
      {showUserAccessModal && (
        <UserAccessModal
          isOpen={showUserAccessModal}
          currentUserRole={currentRole}
          onClose={() => setShowUserAccessModal(false)}
        />
      )}
    </>
  );
};
